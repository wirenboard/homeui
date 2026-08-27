import type ts from 'typescript';
import type { Diagnostic } from 'typescript';
import { adviseForJs, loadTsEditorSupport } from './ts-language-service';

describe('ts-language-service', () => {
  it('builds editor support with extensions and a completion source seeded with wb-rules types', async () => {
    const support = await loadTsEditorSupport('demo.ts', 'const n: number = 1;\n');
    expect(support.extensions.length).toBeGreaterThanOrEqual(4);
    expect(typeof support.completionSource).toBe('function');
    // 30s: the language-service cold start exceeds the 5s default on CI
  }, 30000);

  it('builds support for plain .js rule files too (allowJs completions/hover)', async () => {
    const support = await loadTsEditorSupport('legacy.js', 'var n = 1;\n');
    expect(support.extensions.length).toBeGreaterThanOrEqual(4);
    expect(typeof support.completionSource).toBe('function');
  }, 30000);

  it('reuses the environment for the same file and rebuilds for another file', async () => {
    const first = await loadTsEditorSupport('demo.ts', '');
    const again = await loadTsEditorSupport('demo.ts', '');
    expect(again).toBe(first);
    const other = await loadTsEditorSupport('other.ts', '');
    expect(other).not.toBe(first);
  }, 30000);

  it('reseeds a reused environment with the stored content (discarded edits do not linger)', async () => {
    const support = await loadTsEditorSupport('reseed.ts', 'const n: number = 1;\n');
    expect(support.getDiagnostics()).toEqual([]);
    // typed and left without saving: the environment holds the discarded text
    support.reseed('const n: number = "nope";\n');
    expect(support.getDiagnostics()).toHaveLength(1);
    const reopened = await loadTsEditorSupport('reseed.ts', 'const n: number = 1;\n');
    expect(reopened).toBe(support);
    expect(reopened.getDiagnostics()).toEqual([]);
  }, 30000);
});

describe('typed wb-rules API surface', () => {
  // the promise-native idiom must check clean: changed() defaults to any
  it('accepts awaited changed() values in arithmetic without complaints', async () => {
    const content = [
      'async function scenario() {',
      '  let value = await changed("ts_demo/temperature");',
      '  log(`got ${value}`);',
      '  dev["ts_demo/new_temperature"] = value + 1;',
      '}',
      'scenario();',
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('changed-flow.ts', content);
    expect(support.getDiagnostics()).toEqual([]);
  }, 30000);

  it('rejects options illegal for the control type and rule names as rule ids', async () => {
    const content = [
      'defineVirtualDevice("d", {',
      '  cells: { sw: { type: "switch", value: false, min: 0 } },',
      '});',
      'disableRule("named-rule");',
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('typed-errors.ts', content);
    const diags = support.getDiagnostics();
    expect(diags.some((d) => d.line === 2 && d.message.includes('\'min\''))).toBe(true);
    expect(diags.some((d) => d.line === 4)).toBe(true);
  }, 30000);
});

describe('top-level await', () => {
  it('does not warn on top-level await (module mode)', async () => {
    const content = [
      'const answer = await Promise.resolve(42);',
      'log.info(`${answer}`);',
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('tla.ts', content);
    expect(support.getDiagnostics()).toEqual([]);
  }, 30000);
});

describe('live-device registry typing', () => {
  const registry = 'interface WbControls { "climate/temperature": "temperature"; "living/lamp": "switch"; }\n';

  it('flags wrong-typed writes to registered string references', async () => {
    const content = [
      'getControl("climate/temperature").setValue("nope");', // line 1
      'dev["climate/temperature"] = "nope";', // line 2
      'dev["living/lamp"] = 5;', // line 3
    ].join('\n');
    const support = await loadTsEditorSupport('registry-typed.ts', content, undefined, registry);
    const diags = support.getDiagnostics();
    expect(diags.some((d) => d.line === 1)).toBe(true);
    expect(diags.some((d) => d.line === 2)).toBe(true);
    expect(diags.some((d) => d.line === 3)).toBe(true);
  }, 30000);

  it('type-checks .js rule files too (checkJs), flagging wrong-typed registry writes', async () => {
    const content = [
      'dev["climate/temperature"] = "nope";', // line 1: registered numeric -> flagged in .js too
      'dev["living/lamp"] = 5;', // line 2: registered switch -> flagged
    ].join('\n');
    const support = await loadTsEditorSupport('registry-typed.js', content, undefined, registry);
    const diags = support.getDiagnostics();
    expect(diags.some((d) => d.line === 1)).toBe(true);
    expect(diags.some((d) => d.line === 2)).toBe(true);
  }, 30000);

  it('does not flag a correctly-typed or loose .js registry write', async () => {
    const content = [
      'dev["climate/temperature"] = 21.5;', // correct numeric
      'dev["unknown/ctrl"] = "anything";', // unregistered -> loose (any)
    ].join('\n');
    const support = await loadTsEditorSupport('registry-ok.js', content, undefined, registry);
    expect(support.getDiagnostics()).toEqual([]);
  }, 30000);

  it('keeps require() loose and accepts new PersistentStorage/StorableObject in .js', async () => {
    // in a .js file TypeScript treats require() as a CommonJS import; the wildcard
    // module in wb-rules.d.ts must keep it clean (modules resolve at runtime)
    const content = [
      'var Logger = require("logger.mod").Logger;',
      'var log = new Logger("x");',
      'var ps = new PersistentStorage("wb-scenarios", { global: true });',
      'ps.tracked = new StorableObject({ n: 1 });',
      'log.info(ps.tracked.n);',
      'dev["climate/temperature"] = "still checked";', // line 6: registry write is still flagged
    ].join('\n');
    const support = await loadTsEditorSupport('system-style.js', content, undefined, registry);
    const diags = support.getDiagnostics();
    expect(diags.map((d) => d.line)).toEqual([6]);
  }, 30000);

  it('keeps require() loose and PersistentStorage constructible in .ts as well', async () => {
    const content = [
      'const m = require("some-helper.mod");',
      'm.anything(1);',
      'const s = new PersistentStorage<{ hits: number }>("built", { global: true });',
      's.hits = 1;',
      's.hits = "one";', // line 5: typed shape enforced through new
    ].join('\n');
    const support = await loadTsEditorSupport('constructible.ts', content, undefined, registry);
    expect(support.getDiagnostics().map((d) => d.line)).toEqual([5]);
  }, 30000);

  it('does not report sloppy-JS idioms in .js (Date arithmetic) but does in .ts', async () => {
    const content = [
      'var t0 = new Date();',
      'var elapsed = new Date() - t0;', // TS2362 in TypeScript terms; idiomatic JS
    ].join('\n');
    const js = await loadTsEditorSupport('elapsed.js', content, undefined, registry);
    expect(js.getDiagnostics()).toEqual([]);
    const tsFile = await loadTsEditorSupport('elapsed.ts', content, undefined, registry);
    // TypeScript complains about both operands (TS2362 + TS2363), same line
    const tsLines = tsFile.getDiagnostics().map((d) => d.line);
    expect(tsLines.length).toBeGreaterThan(0);
    expect(tsLines.every((l) => l === 2)).toBe(true);
  }, 30000);

  it('leaves references not in the registry loose', async () => {
    const content = [
      'dev["unknown/ctrl"] = "anything";',
      'const c = getControl("unknown/ctrl");',
      'const n = dev["climate/temperature"] + 1;', // registered numeric, fine in arithmetic
    ].join('\n');
    const support = await loadTsEditorSupport('registry-loose.ts', content, undefined, registry);
    expect(support.getDiagnostics()).toEqual([]);
  }, 30000);

  it('types the value awaited from changed() by the registry', async () => {
    const content = [
      'const t: number = await changed("climate/temperature");', // line 1: registered numeric -> ok
      'const bad: boolean = await changed("climate/temperature");', // line 2: numeric is not boolean -> flagged
      'const loose = await changed("unknown/ctrl");', // line 3: unregistered stays any
      'dev["climate/temperature"] = loose + 1;', // line 4: any flows freely
    ].join('\n');
    const support = await loadTsEditorSupport('changed-registry.ts', content, undefined, registry);
    const diags = support.getDiagnostics();
    expect(diags.some((d) => d.line === 2)).toBe(true);
    expect(diags.some((d) => d.line === 1)).toBe(false);
    expect(diags.some((d) => d.line === 3)).toBe(false);
    expect(diags.some((d) => d.line === 4)).toBe(false);
  }, 30000);
});

describe('promise-in-condition warning', () => {
  const isPromiseWarning = (message: string) =>
    message.includes('Promise') && message.includes('await');

  it('warns on a Promise used as a while condition (the sleep() hang)', async () => {
    const support = await loadTsEditorSupport('while-sleep.ts', 'while (sleep(1000)) {}\n');
    const diags = support.getDiagnostics();
    expect(diags.some((d) => d.line === 1 && isPromiseWarning(d.message))).toBe(true);
  }, 30000);

  it('warns on a Promise used as an if condition', async () => {
    const support = await loadTsEditorSupport('if-sleep.ts', 'if (sleep(1000)) {}\n');
    const diags = support.getDiagnostics();
    expect(diags.some((d) => d.line === 1 && isPromiseWarning(d.message))).toBe(true);
  }, 30000);

  it('warns on a Promise used as a ternary condition', async () => {
    const support = await loadTsEditorSupport('ternary-sleep.ts', 'const x = sleep(1000) ? 1 : 2;\n');
    const diags = support.getDiagnostics();
    expect(diags.some((d) => d.line === 1 && isPromiseWarning(d.message))).toBe(true);
  }, 30000);

  it('does not warn on plain boolean/number conditions', async () => {
    const content = [
      'while (true) {}',
      'if (1 > 0) {}',
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('plain-conditions.ts', content);
    expect(support.getDiagnostics().some((d) => isPromiseWarning(d.message))).toBe(false);
  }, 30000);

  it('does not warn when the promise is awaited before the condition', async () => {
    // await unwraps to void, not a Promise, so this is a legitimate value
    const content = [
      'const p = await sleep(1000);',
      'if (p) {}',
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('awaited-condition.ts', content);
    expect(support.getDiagnostics().some((d) => isPromiseWarning(d.message))).toBe(false);
  }, 30000);
});

describe('floating promise in a loop warning', () => {
  const isFloatingWarning = (message: string) => message.includes('not awaited');

  it('warns on a floating promise statement inside a for(;;) loop', async () => {
    const content = [
      'for (;;) {',
      '  sleep(1000);', // line 2: floating - flagged
      '  log("123");', // line 3: returns void - not flagged
      '}',
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('floating-for.ts', content);
    const diags = support.getDiagnostics();
    expect(diags.some((d) => d.line === 2 && isFloatingWarning(d.message))).toBe(true);
    expect(diags.some((d) => d.line === 3 && isFloatingWarning(d.message))).toBe(false);
  }, 30000);

  it('does not warn on await/void inside the loop, nor on a floating IIFE', async () => {
    const content = [
      'for (;;) {',
      '  await sleep(1000);',
      '  void sleep(1000);',
      '  (async () => { await sleep(1000); })();',
      '}',
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('floating-ok.ts', content);
    expect(support.getDiagnostics().some((d) => isFloatingWarning(d.message))).toBe(false);
  }, 30000);

  it('does not flag fire-and-forget async work outside a loop', async () => {
    const content = [
      'async function scenario() { await sleep(1000); }',
      'scenario();',
      '(async () => { await sleep(1000); })();',
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('fire-and-forget.ts', content);
    expect(support.getDiagnostics().some((d) => isFloatingWarning(d.message))).toBe(false);
  }, 30000);

  it('does not flag a floating promise in a bounded loop (parallel dispatch)', async () => {
    const content = [
      'for (const x of [1, 2]) {',
      '  sleep(1000);',
      '}',
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('floating-bounded.ts', content);
    expect(support.getDiagnostics().some((d) => isFloatingWarning(d.message))).toBe(false);
  }, 30000);

  it('warns on a floating promise inside a while(true) loop', async () => {
    const content = [
      'while (true) {',
      '  sleep(1000);', // line 2: floating in an infinite loop - flagged
      '}',
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('floating-while-true.ts', content);
    const diags = support.getDiagnostics();
    expect(diags.some((d) => d.line === 2 && isFloatingWarning(d.message))).toBe(true);
  }, 30000);
});

describe('await-non-Promise and Promise-to-control warnings', () => {
  it('warns when awaiting a value that is not a Promise', async () => {
    const content = [
      'const c = getControl("d/c");',
      'if (c) {',
      '  await c.getValue();', // line 3: getValue() is synchronous -> await is a no-op
      '}',
      'await sleep(1000);', // line 5: a real Promise -> fine
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('await-nonthenable.ts', content);
    const diags = support.getDiagnostics();
    expect(diags.some((d) => d.line === 3 && d.message.includes('no effect'))).toBe(true);
    expect(diags.some((d) => d.line === 5 && d.message.includes('no effect'))).toBe(false);
  }, 30000);

  it('does not warn on await of an any-typed value', async () => {
    const content = ['const x: any = 1;', 'await x;', ''].join('\n');
    const support = await loadTsEditorSupport('await-any.ts', content);
    expect(support.getDiagnostics().some((d) => d.message.includes('no effect'))).toBe(false);
  }, 30000);

  it('warns when a Promise is assigned to a control via dev[...]', async () => {
    const content = [
      'dev["d/c"] = sleep(1000);', // line 1: a Promise into a control
      'dev["d/c"] = 5;', // line 2: fine
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('promise-to-control.ts', content);
    const diags = support.getDiagnostics();
    expect(diags.some((d) => d.line === 1 && d.message.includes('written to a control'))).toBe(true);
    expect(diags.some((d) => d.line === 2 && d.message.includes('written to a control'))).toBe(false);
  }, 30000);

  it('does not flag dev[...] writes when dev is shadowed by a local', async () => {
    const content = [
      'const dev = [];',
      'dev["k"] = sleep(1000);',
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('shadowed-dev.ts', content);
    expect(
      support.getDiagnostics().some((d) => d.message.includes('written to a control')),
    ).toBe(false);
  }, 30000);

  it('does not warn on awaiting a bare generic type parameter', async () => {
    // T has no callable then yet may resolve to a Promise once instantiated
    const content = [
      'async function pick<T>(v: T) { return await v; }',
      'pick(sleep(1000));',
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('await-generic.ts', content);
    expect(support.getDiagnostics().some((d) => d.message.includes('no effect'))).toBe(false);
  }, 30000);
});

describe('type-aware completion surface', () => {
  // regression: valtown's whitelist filter used to hide all ambient globals
  it('offers the wb-rules API for an identifier prefix', async () => {
    const { CompletionContext } = await import('@codemirror/autocomplete');
    const { EditorState } = await import('@codemirror/state');
    const content = 'var motion = 1;\ndefi';
    const support = await loadTsEditorSupport('probe.ts', content);
    const state = EditorState.create({ doc: content, extensions: support.extensions });
    const result = await support.completionSource(
      new CompletionContext(state, state.doc.length, false),
    );
    const labels = (result?.options ?? []).map((o) => o.label);
    expect(labels).toContain('defineRule');
    expect(labels).toContain('defineVirtualDevice');
  }, 30000);
});

describe('adviseForJs (the .js advisory policy, mirrored from the controller check)', () => {
  const fakeTs = { DiagnosticCategory: { Warning: 0, Error: 1 } } as unknown as typeof ts;
  const diag = (code: number, category = 1) => ({ code, category, messageText: 'm' }) as unknown as Diagnostic;

  it('drops sloppy-idiom codes and downgrades errors to warnings for .js', () => {
    const out = adviseForJs(fakeTs, 'rule.js', [diag(2362), diag(2703), diag(2322), diag(1121)]);
    expect(out.map((d) => [d.code, d.category])).toEqual([[2322, 0], [1121, 0]]);
  });

  it('leaves .ts diagnostics untouched', () => {
    const input = [diag(2362), diag(2322)];
    expect(adviseForJs(fakeTs, 'rule.ts', input)).toBe(input);
  });
});
