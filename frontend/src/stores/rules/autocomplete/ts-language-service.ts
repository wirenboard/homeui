import type { Diagnostic, Node, Program, Type, TypeChecker } from 'typescript';
import { tsDiagnosticsLinter } from './ts-diagnostics-linter';
import type { TsEditorSupport, TsModule } from './types';
import wbRulesDts from './wb-rules.d.ts?raw';

// Browser-side TypeScript language service for .ts rule files: live type
// checking (squiggles while you type), type-aware completions and hover
// type info, seeded with the wb-rules builtin declarations.
//
// Everything heavy (the typescript package and its lib.*.d.ts files) is
// imported dynamically from here, and this module itself is imported
// dynamically by the edit page, so .js-only users never download it.

// the same set the engine-side check uses: --lib esnext, no DOM globals
const libFiles = import.meta.glob('/node_modules/typescript/lib/lib.es*.d.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const decoratorLibs = import.meta.glob('/node_modules/typescript/lib/lib.decorators*.d.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

let cached: Promise<TsEditorSupport> | null = null;
let cachedPath = '';
let cachedTypes = '';
let cachedRegistry = '';

// CodeMirror normalizes line endings on ingest, so editor positions are
// LF-based; the language service must hold the same text or every
// diagnostic offset, completion and hover position after line 1 of a CRLF
// file drifts (one character per preceding line)
const normalizeEol = (s: string) => s.replace(/\r\n/g, '\n');

// custom diagnostic code for "Promise used as a condition"; well outside the
// range TypeScript itself emits, so it never collides with a real TS code
const PROMISE_CONDITION_CODE = 990001;
const PROMISE_CONDITION_MESSAGE =
  'This condition is always truthy: the expression is a Promise. Did you forget \'await\'?';
const PROMISE_FLOATING_CODE = 990002;
const PROMISE_FLOATING_MESSAGE =
  'This Promise is not awaited. Did you forget \'await\'? A floating Promise does not pause a loop.';
const AWAIT_NONTHENABLE_CODE = 990003;
const AWAIT_NONTHENABLE_MESSAGE =
  'This \'await\' has no effect: the value is not a Promise.';
const PROMISE_TO_CONTROL_CODE = 990004;
const PROMISE_TO_CONTROL_MESSAGE =
  'A Promise is being written to a control. Did you forget \'await\'?';

async function build(
  path: string,
  initialContent: string,
  typesDts: string,
  registryDts: string,
): Promise<TsEditorSupport> {
  const [ts, vfs, cmts] = await Promise.all([
    import('typescript').then((m) => m.default),
    import('@typescript/vfs'),
    import('@valtown/codemirror-ts'),
  ]);

  const compilerOptions = {
    target: ts.ScriptTarget.ESNext,
    lib: ['lib.esnext.d.ts'],
    allowJs: true,
    // type-check .js rule files too (against the wb-rules types + registry), so
    // e.g. dev["buzzer/enabled"] = 123 is flagged in legacy .js as well as .ts.
    // TS parses each file per its extension, so a .js `a < b > (c)` stays JS
    // comparisons, not a generic call - checkJs only turns error reporting on.
    checkJs: true,
    strict: false,
    noEmit: true,
    // rule files may use top-level await (the engine wraps them in an async
    // function); TypeScript only allows it in a module, so force module mode
    // to match the engine's on-controller check
    module: ts.ModuleKind.ESNext,
    moduleDetection: ts.ModuleDetectionKind.Force,
    // the engine transpiles rule files to CommonJS with esModuleInterop, so a
    // default import of a built-in module (import fs from "fs") works at
    // runtime and its check passes --esModuleInterop; stated explicitly here
    // (TypeScript 6 defaults it on) so the editor's verdict never depends on
    // the bundled TypeScript's defaults
    esModuleInterop: true,
  };

  const fsMap = new Map<string, string>();
  for (const [modulePath, text] of Object.entries({ ...libFiles, ...decoratorLibs })) {
    fsMap.set('/' + modulePath.split('/').pop(), text);
  }
  fsMap.set('/wb-rules.d.ts', typesDts);
  fsMap.set(path, normalizeEol(initialContent) || '\n');

  // the live-device registry (declaration-merges into WbControls) types the
  // stringly-referenced getControl()/dev[] APIs; only added when non-empty
  const rootFiles = [path, '/wb-rules.d.ts'];
  if (registryDts) {
    fsMap.set('/wb-controls.d.ts', registryDts);
    rootFiles.push('/wb-controls.d.ts');
  }

  const system = vfs.createSystem(fsMap);
  const env = vfs.createVirtualTypeScriptEnvironment(system, rootFiles, ts, compilerOptions);

  // A value used as a condition is coerced to boolean, so a Promise (any
  // thenable) there is always truthy and never awaited - the classic
  // `while (sleep(1000)) {}` that hangs the controller. TypeScript's built-in
  // TS2801 only covers `if` and is off outside strict mode, so we flag it.
  // `ts` is captured (not a param) so its guards narrow the node types.
  const isThenableType = (checker: TypeChecker, type: Type, at: Node): boolean => {
    // `any`/`unknown` (and the error type) are pervasive in this loose
    // codebase; never flag them - a Promise has a concrete, callable `then`
    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return false;

    const then = checker.getPropertyOfType(checker.getApparentType(type), 'then');
    if (then) {
      const thenType = checker.getTypeOfSymbolAtLocation(then, at);
      if (thenType.getCallSignatures().length > 0) return true;
    }
    // opaque Promise aliases may not resolve a callable `then`; fall back to
    // the name the checker gives the type
    return (type.aliasSymbol ?? type.getSymbol())?.getName() === 'Promise';
  };

  // "forgot await" / Promise-misuse shapes the type checker misses under
  // non-strict, all flagged as warnings:
  //  (1) a Promise used as a condition (if/while/do/for/ternary) - always
  //      truthy, never awaited: `while (sleep(1000)) {}`;
  //  (2) a floating Promise statement inside an infinite loop - a Promise-
  //      returning call whose result is thrown away: `for (;;) { sleep(1000); }`
  //      never pauses (bounded loops are legitimate parallel dispatch);
  //  (3) `await` on a non-Promise - a no-op, usually a misunderstanding, e.g.
  //      `await getControl(x).getValue()` (getValue is synchronous);
  //  (4) a Promise written to a control - `dev["d/c"] = sleep(1000)` stores
  //      "[object Promise]" into the cell.
  const promiseAwaitDiagnostics = (program: Program | undefined): Diagnostic[] => {
    const sourceFile = program?.getSourceFile(path);
    if (!program || !sourceFile) return [];
    const checker = program.getTypeChecker();
    const diagnostics: Diagnostic[] = [];

    const pushWarning = (node: Node, code: number, message: string) => {
      const start = node.getStart(sourceFile);
      diagnostics.push({
        file: sourceFile,
        start,
        length: node.getEnd() - start,
        code,
        category: ts.DiagnosticCategory.Warning,
        messageText: message,
      });
    };
    // warn only when the node's own type is a Promise/thenable
    const warn = (node: Node, code: number, message: string) => {
      if (isThenableType(checker, checker.getTypeAtLocation(node), node)) {
        pushWarning(node, code, message);
      }
    };

    // never flag `await` on these: any/unknown/never are pervasive in this
    // loose codebase, and a bare generic type parameter (`T`) has no callable
    // `then` yet could resolve to a Promise once instantiated
    const isAnyOrUnknown = (type: Type): boolean =>
      (type.flags &
        (ts.TypeFlags.Any |
          ts.TypeFlags.Unknown |
          ts.TypeFlags.Never |
          ts.TypeFlags.TypeParameter)) !== 0;
    // true if the type - or, for a union, any member of it - is a Promise
    const anyConstituentThenable = (type: Type, at: Node): boolean => {
      const parts = type.isUnion() ? type.types : [type];
      return parts.some((p) => isThenableType(checker, p, at));
    };

    // await/void/assignment capture or unwrap the value - not a floating Promise
    const isFloating = (expr: Node): boolean => {
      if (ts.isAwaitExpression(expr) || ts.isVoidExpression(expr)) return false;
      if (
        ts.isBinaryExpression(expr) &&
        expr.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        expr.operatorToken.kind <= ts.SyntaxKind.LastAssignment
      ) {
        return false;
      }
      return true;
    };

    // a loop that never terminates on its own: `for (;;)`, `while (true)`,
    // `do ... while (true)`. Only inside such a loop is a floating Promise
    // almost certainly a forgotten await meant to pace it; a bounded loop
    // (`for (const z of zones) { runShellCommand(...); }`) is legitimate
    // parallel dispatch, so don't flag it.
    const isInfiniteLoop = (n: Node): boolean => {
      if (ts.isForStatement(n)) return !n.condition;
      if (ts.isWhileStatement(n) || ts.isDoStatement(n)) {
        return n.expression.kind === ts.SyntaxKind.TrueKeyword;
      }
      return false;
    };

    // `(async () => {...})()` and the like intentionally start async work; a
    // floating IIFE is not a forgotten await, so don't flag it.
    const isIIFE = (expr: Node): boolean => {
      if (!ts.isCallExpression(expr)) return false;
      let callee: Node = expr.expression;
      while (ts.isParenthesizedExpression(callee)) callee = callee.expression;
      return ts.isFunctionExpression(callee) || ts.isArrowFunction(callee);
    };

    const visit = (node: Node, inInfiniteLoop: boolean) => {
      if (ts.isIfStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) {
        warn(node.expression, PROMISE_CONDITION_CODE, PROMISE_CONDITION_MESSAGE);
      } else if (ts.isForStatement(node) && node.condition) {
        warn(node.condition, PROMISE_CONDITION_CODE, PROMISE_CONDITION_MESSAGE);
      } else if (ts.isConditionalExpression(node)) {
        warn(node.condition, PROMISE_CONDITION_CODE, PROMISE_CONDITION_MESSAGE);
      } else if (
        // only inside an infinite loop: a floating Promise there is almost
        // always a forgotten await meant to pace the loop
        // (`for (;;) { sleep(1000); }` never pauses). A bounded loop's
        // fire-and-forget (`for (const z of zones) { runShellCommand(...); }`)
        // is legitimate parallel dispatch, and so is fire-and-forget outside a
        // loop (`scenario();`, `(async()=>{})()`), so don't flag those.
        inInfiniteLoop &&
        ts.isExpressionStatement(node) &&
        isFloating(node.expression) &&
        !isIIFE(node.expression)
      ) {
        warn(node.expression, PROMISE_FLOATING_CODE, PROMISE_FLOATING_MESSAGE);
      } else if (ts.isAwaitExpression(node)) {
        // awaiting a non-Promise is a no-op - usually a misunderstanding, e.g.
        // getControl(x).getValue() is synchronous
        const t = checker.getTypeAtLocation(node.expression);
        if (!isAnyOrUnknown(t) && !anyConstituentThenable(t, node.expression)) {
          pushWarning(node.expression, AWAIT_NONTHENABLE_CODE, AWAIT_NONTHENABLE_MESSAGE);
        }
      } else if (
        // writing a Promise to a control, e.g. dev["d/c"] = sleep(1000), stores
        // "[object Promise]" into the cell - almost always a forgotten await
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isElementAccessExpression(node.left) &&
        ts.isIdentifier(node.left.expression) &&
        node.left.expression.text === 'dev'
      ) {
        // only the ambient global `dev` addresses controls; a user's own `dev`
        // (e.g. `const dev = []`) declared in the rule file shadows it, so skip
        // when any declaration of the symbol lives in the rule source itself
        const sym = checker.getSymbolAtLocation(node.left.expression);
        const shadowed = sym
          ?.getDeclarations()
          ?.some((d) => d.getSourceFile().fileName === path);
        if (!shadowed) {
          warn(node.right, PROMISE_TO_CONTROL_CODE, PROMISE_TO_CONTROL_MESSAGE);
        }
      }
      // a nested function is a new scope - its statements don't pace this loop
      const childInInfiniteLoop = ts.isFunctionLike(node)
        ? false
        : inInfiniteLoop || isInfiniteLoop(node);
      ts.forEachChild(node, (child) => visit(child, childInInfiniteLoop));
    };
    try {
      visit(sourceFile, false);
    } catch {
      // a checker call in the walk threw; return the diagnostics collected so
      // far rather than letting getSemanticDiagnostics throw and drop ALL
      // squiggles (both the base checks and these custom warnings)
    }
    return diagnostics;
  };

  // Surface the custom forgot-await warnings through the language service's own
  // semantic diagnostics, so they both render as warning squiggles (the linter
  // reads getSemanticDiagnostics) and are picked up by getDiagnostics below -
  // merged with, never replacing, the built-in checks.
  const baseGetSemanticDiagnostics = env.languageService.getSemanticDiagnostics.bind(
    env.languageService,
  );
  env.languageService.getSemanticDiagnostics = (fileName: string): Diagnostic[] => {
    const base = adviseForJs(ts, fileName, baseGetSemanticDiagnostics(fileName));
    if (fileName !== path) return base;
    return [...base, ...promiseAwaitDiagnostics(env.languageService.getProgram())];
  };

  return {
    extensions: [
      // without the flag, valtown's completion filter drops every ambient
      // global (sortText "15") not on its hardcoded standard-JS whitelist -
      // i.e. the entire wb-rules API from wb-rules.d.ts
      cmts.tsFacet.of({ env, path, keepLegacyLimitationForAutocompletionSymbols: false }),
      cmts.tsSync(),
      tsDiagnosticsLinter(ts, env, path),
      cmts.tsHover(),
    ],
    completionSource: cmts.tsAutocomplete(),
    reseed: (content: string) => {
      // an empty file must still exist in the vfs (same rule as build)
      env.updateFile(path, normalizeEol(content) || '\n');
    },
    // current local verdict, used to de-duplicate the controller's
    // diagnostics against what the editor already shows
    getDiagnostics: () => {
      const sourceFile = env.getSourceFile(path);
      if (!sourceFile) return [];
      const all = [
        ...env.languageService.getSyntacticDiagnostics(path),
        // getSemanticDiagnostics is wrapped above to append the custom
        // Promise-in-condition warning, so it merges in here for free
        ...env.languageService.getSemanticDiagnostics(path),
      ];
      return all
        .filter((d) => d.start !== undefined)
        .map((d) => ({
          line: sourceFile.getLineAndCharacterOfPosition(d.start).line + 1,
          message: ts.flattenDiagnosticMessageText(d.messageText, ' '),
        }));
    },
  };
}

// The controller runs the same check with checkJs; mirror its policy here so
// the editor and the journal agree. In a .js file the check is advisory:
// TypeScript's semantic complaints about valid sloppy-mode idioms are dropped
// (Date arithmetic TS2362/2363, `with` TS2410, `delete` of an identifier
// TS2703) and everything else is shown as a warning, not an error -
// JavaScript is not typed by contract. Grammar-class codes (a legacy octal
// literal, a top-level return) stay: TypeScript reports no semantic
// diagnostics at all while one is present, so the user should see why the
// file is otherwise unchecked. .ts files are untouched.
const SLOPPY_JS_CODES = new Set([2362, 2363, 2410, 2703]);

export function adviseForJs(ts: TsModule, fileName: string, diags: Diagnostic[]): Diagnostic[] {
  if (!fileName.endsWith('.js')) return diags;
  const out: Diagnostic[] = [];
  for (const d of diags) {
    if (SLOPPY_JS_CODES.has(d.code)) continue;
    out.push(d.category === ts.DiagnosticCategory.Error
      ? { ...d, category: ts.DiagnosticCategory.Warning }
      : d);
  }
  return out;
}

// One shared environment: rule files are edited one at a time, and the
// language service survives page switches (path changes recreate it).
export function loadTsEditorSupport(
  fileName: string,
  initialContent: string,
  controllerTypes?: string,
  registryDts = '',
): Promise<TsEditorSupport> {
  const path = '/' + (fileName.replace(/^\/+/, '') || 'rule.ts');
  // No controller types means a transient GetTypes failure on firmware that
  // ADVERTISES the method: fall back to the vendored declarations of the
  // engine this UI ships for. Legacy firmware without Editor.GetTypes never
  // gets here - the edit page builds no language service at all rather than
  // advertise APIs the installed engine does not have.
  const typesDts = controllerTypes || wbRulesDts;
  // The registry is a snapshot taken when the editor opens (like the
  // controller types), so a change in it rebuilds the environment. The
  // same file reopened with the same types and registry reuses it - but
  // its text must be reseeded: tsSync() tracks in-editor edits only, so the
  // environment still holds whatever was typed (and possibly discarded) in
  // the previous editor, and a new view does not resync until the first
  // keystroke - phantom diagnostics, hover and completions until then.
  if (
    !cached ||
    cachedPath !== path ||
    cachedTypes !== typesDts ||
    cachedRegistry !== registryDts
  ) {
    cachedPath = path;
    cachedTypes = typesDts;
    cachedRegistry = registryDts;
    const building = build(path, initialContent, typesDts, registryDts);
    cached = building;
    return building.catch((e) => {
      if (cached === building) cached = null; // a failed load must not poison TS support forever
      throw e;
    });
  }
  return cached.then((support) => {
    support.reseed(initialContent);
    return support;
  });
}
