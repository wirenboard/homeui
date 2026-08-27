import type { Diagnostic, Node, Program, Type, TypeChecker } from 'typescript';
import { importRefreshPlugin } from './import-refresh';
import { lintRefresher } from './lint-refresh';
import { createImportSet, MODULES_ROOT } from './module-resolution';
import { tsDiagnosticsLinter } from './ts-diagnostics-linter';
import { withCompletionDetails } from './ts-help';
import type { ModuleResolver, TsEditorSupport, TsModule } from './types';
import wbRulesDts from './wb-rules.d.ts?raw';

// Browser-side TypeScript language service for rule files: live diagnostics,
// completions and hover. Lazy-loaded by the edit page (typescript + lib files are heavy).

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

// CodeMirror normalizes line endings on ingest, so the service must hold LF text
// too or every position after line 1 of a CRLF file drifts
const normalizeEol = (s: string) => s.replace(/\r\n/g, '\n');

// custom diagnostic codes, well outside the range TypeScript itself emits
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
  resolveModule: ModuleResolver | null,
  from: string,
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
    // .js rule files are type-checked too, as the controller does
    checkJs: true,
    strict: false,
    noEmit: true,
    // module mode (TLA is only legal there), engine settings; bare specifiers -> MODULES_ROOT
    module: ts.ModuleKind.Preserve,
    moduleDetection: ts.ModuleDetectionKind.Force,
    allowImportingTsExtensions: true,
    paths: { '*': [MODULES_ROOT + '/*'] },
  };

  const fsMap = new Map<string, string>();
  for (const [modulePath, text] of Object.entries({ ...libFiles, ...decoratorLibs })) {
    fsMap.set('/' + modulePath.split('/').pop(), text);
  }
  fsMap.set('/wb-rules.d.ts', typesDts);
  fsMap.set(path, normalizeEol(initialContent) || '\n');

  const imports = createImportSet(resolveModule, path, from);
  for (const [modulePath, text] of await imports.prefetch(initialContent)) fsMap.set(modulePath, normalizeEol(text));

  // live-device registry, declaration-merged into WbControls (see registry.ts)
  const rootFiles = [path, '/wb-rules.d.ts'];
  if (registryDts) {
    fsMap.set('/wb-controls.d.ts', registryDts);
    rootFiles.push('/wb-controls.d.ts');
  }

  const system = vfs.createSystem(fsMap);
  const env = vfs.createVirtualTypeScriptEnvironment(system, rootFiles, ts, compilerOptions);

  const isThenableType = (checker: TypeChecker, type: Type, at: Node): boolean => {
    // any/unknown are pervasive in this loose codebase; never flag them
    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return false;

    const then = checker.getPropertyOfType(checker.getApparentType(type), 'then');
    if (then) {
      const thenType = checker.getTypeOfSymbolAtLocation(then, at);
      if (thenType.getCallSignatures().length > 0) return true;
    }
    // opaque Promise aliases may not resolve a callable `then`
    return (type.aliasSymbol ?? type.getSymbol())?.getName() === 'Promise';
  };

  // "forgot await" shapes the checker misses under non-strict (TS2801 covers only
  // `if`, and only in strict mode), all warnings: Promise as a condition, floating
  // Promise in an infinite loop, `await` on a non-Promise, Promise written to a control
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
    const warn = (node: Node, code: number, message: string) => {
      if (isThenableType(checker, checker.getTypeAtLocation(node), node)) {
        pushWarning(node, code, message);
      }
    };

    // a bare type parameter has no callable `then` yet may resolve to a Promise once instantiated
    const isAnyOrUnknown = (type: Type): boolean =>
      (type.flags &
        (ts.TypeFlags.Any |
          ts.TypeFlags.Unknown |
          ts.TypeFlags.Never |
          ts.TypeFlags.TypeParameter)) !== 0;
    const anyConstituentThenable = (type: Type, at: Node): boolean => {
      const parts = type.isUnion() ? type.types : [type];
      return parts.some((p) => isThenableType(checker, p, at));
    };

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

    // only inside a never-terminating loop is a floating Promise almost certainly a
    // forgotten pacing await; a bounded loop's fire-and-forget is legitimate parallel dispatch
    const isInfiniteLoop = (n: Node): boolean => {
      if (ts.isForStatement(n)) return !n.condition;
      if (ts.isWhileStatement(n) || ts.isDoStatement(n)) {
        return n.expression.kind === ts.SyntaxKind.TrueKeyword;
      }
      return false;
    };

    // a floating IIFE intentionally starts async work
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
        inInfiniteLoop &&
        ts.isExpressionStatement(node) &&
        isFloating(node.expression) &&
        !isIIFE(node.expression)
      ) {
        warn(node.expression, PROMISE_FLOATING_CODE, PROMISE_FLOATING_MESSAGE);
      } else if (ts.isAwaitExpression(node)) {
        const t = checker.getTypeAtLocation(node.expression);
        if (!isAnyOrUnknown(t) && !anyConstituentThenable(t, node.expression)) {
          pushWarning(node.expression, AWAIT_NONTHENABLE_CODE, AWAIT_NONTHENABLE_MESSAGE);
        }
      } else if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isElementAccessExpression(node.left) &&
        ts.isIdentifier(node.left.expression) &&
        node.left.expression.text === 'dev'
      ) {
        // a user's own `dev` declared in the rule file shadows the ambient global
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
      // keep what was collected rather than let getSemanticDiagnostics throw and drop all squiggles
    }
    return diagnostics;
  };

  // append the custom warnings to the service's own semantic diagnostics so the
  // linter and getDiagnostics below both see them
  const baseGetSemanticDiagnostics = env.languageService.getSemanticDiagnostics.bind(
    env.languageService,
  );
  env.languageService.getSemanticDiagnostics = (fileName: string): Diagnostic[] => {
    const base = adviseForJs(ts, fileName, baseGetSemanticDiagnostics(fileName));
    if (fileName !== path) return base;
    return [...base, ...promiseAwaitDiagnostics(env.languageService.getProgram())];
  };

  const refresher = lintRefresher();
  const refreshImports = (source: string) => imports.refresh(env, source);

  return {
    extensions: [
      // without the flag valtown's completion filter drops every ambient global
      // not on its standard-JS whitelist, i.e. the whole wb-rules API
      cmts.tsFacet.of({ env, path, keepLegacyLimitationForAutocompletionSymbols: false }),
      cmts.tsSync(),
      tsDiagnosticsLinter(ts, env, path, refresher),
      cmts.tsHover(),
      importRefreshPlugin(refreshImports, refresher, resolveModule !== null),
    ],
    refreshImports,
    completionSource: withCompletionDetails(cmts.tsAutocomplete(), env, path, ts),
    reseed: (content: string) => {
      // an empty file must still exist in the vfs
      env.updateFile(path, normalizeEol(content) || '\n');
    },
    // used to de-duplicate the controller's verdict against what the editor already shows
    getDiagnostics: () => {
      const sourceFile = env.getSourceFile(path);
      if (!sourceFile) return [];
      const all = [
        ...env.languageService.getSyntacticDiagnostics(path),
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

// Mirrors the controller's checkJs policy so the editor and the journal agree: in a
// .js file, complaints about valid sloppy-mode idioms (Date arithmetic, `with`,
// `delete x`) are dropped and everything else is downgraded to a warning.
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

// one shared environment; a path/types/registry change recreates it
export function loadTsEditorSupport(
  fileName: string,
  initialContent: string,
  controllerTypes?: string,
  registryDts = '',
  resolveModule: ModuleResolver | null = null, // Editor.ResolveModule; null on old firmware
): Promise<TsEditorSupport> {
  const path = '/' + (fileName.replace(/^\/+/, '') || 'rule.ts');
  // no controller types = a transient GetTypes failure on firmware that advertises
  // it; legacy firmware never gets here (the edit page builds no service at all)
  const typesDts = controllerTypes || wbRulesDts;
  // a reused environment must be reseeded: tsSync() tracks in-editor edits only, so
  // it still holds whatever the previous editor typed (and maybe discarded), and a
  // new view does not resync until the first keystroke
  if (
    !cached ||
    cachedPath !== path ||
    cachedTypes !== typesDts ||
    cachedRegistry !== registryDts
  ) {
    cachedPath = path;
    cachedTypes = typesDts;
    cachedRegistry = registryDts;
    const building = build(path, initialContent, typesDts, registryDts, resolveModule, fileName);
    cached = building;
    return building.catch((e) => {
      if (cached === building) cached = null; // a failed load must not poison TS support forever
      throw e;
    });
  }
  return cached.then((support) => {
    support.reseed(initialContent);
    support.refreshImports(initialContent).catch(() => {});
    return support;
  });
}
