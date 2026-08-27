import { loadTsEditorSupport } from './ts-language-service';
import type { ModuleResolver, ResolvedModule } from './types';

// Imports typed against the controller's modules: the language service asks
// the resolver (Editor.ResolveModule) for every specifier and places the
// sources where TypeScript resolves them - relative next to the rule, bare
// under the modules root through the paths map.
describe('ts-language-service imports', () => {
  const modules: Record<string, ResolvedModule> = {
    // a bare TypeScript module from the module directories
    'test/esm/typed': {
      path: '/etc/wb-rules-modules/test/esm/typed.ts',
      content: [
        'export interface Point { x: number; y: number }',
        'export function typedAdd(a: number, b: number): number { return a + b; }',
        '',
      ].join('\n'),
    },
    // a bare JavaScript ES module with its own relative import
    'test/esm/helper': {
      path: '/etc/wb-rules-modules/test/esm/helper.js',
      content: [
        'import { double } from "./util.js";',
        'export function greet(name) { return "hi " + name + double(1); }',
        '',
      ].join('\n'),
    },
    './util.js': {
      path: '/etc/wb-rules-modules/test/esm/util.js',
      content: 'export const double = (x) => x * 2;\n',
    },
    // a sibling TypeScript file next to the rule
    './lib/strings.ts': {
      path: '/etc/wb-rules/lib/strings.ts',
      content: 'export function takesString(s: string): string { return "got " + s; }\n',
    },
  };
  const calls: string[] = [];
  const resolver: ModuleResolver = async (from, spec) => {
    calls.push(`${from} ${spec}`);
    return modules[spec] ?? null;
  };

  beforeEach(() => {
    calls.length = 0;
  });

  it('types a bare import from the module directories, including a type-only import', async () => {
    const content = [
      'import { typedAdd, type Point } from "test/esm/typed";',
      'const p: Point = { x: 1, y: 2 };',
      'log(typedAdd(p.x, p.y));',
      'log(typedAdd("one", 2));', // line 4: wrong argument type
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('imports-bare.ts', content, undefined, '', resolver);
    const diags = support.getDiagnostics();
    expect(diags).toHaveLength(1);
    expect(diags[0].line).toBe(4);
    expect(diags[0].message).toMatch(/string.*number|number.*string/);
    expect(calls).toContain('imports-bare.ts test/esm/typed');
  }, 30000);

  it('types a relative .ts import next to the rule (allowImportingTsExtensions)', async () => {
    const content = [
      'import { takesString } from "./lib/strings.ts";',
      'log(takesString(42));', // line 2: number is not a string
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('imports-relative.ts', content, undefined, '', resolver);
    const diags = support.getDiagnostics();
    expect(diags).toHaveLength(1);
    expect(diags[0].line).toBe(2);
  }, 30000);

  it('follows a module\'s own relative import so its exports type-check', async () => {
    const content = [
      'import { greet } from "test/esm/helper";',
      'const s: string = greet("x");',
      'const n: number = greet("x");', // line 3: greet returns a string (inferred from the .js module)
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('imports-transitive.ts', content, undefined, '', resolver);
    expect(calls).toContain('/etc/wb-rules-modules/test/esm/helper.js ./util.js');
    const diags = support.getDiagnostics();
    expect(diags.map((d) => d.line)).toEqual([3]);
  }, 30000);

  it('leaves an unresolvable import to the wildcard fallback (any, no error) and without a resolver too', async () => {
    const content = 'import { whatever } from "no-such-module";\nlog(whatever.anything);\n';
    const withResolver = await loadTsEditorSupport('imports-missing.ts', content, undefined, '', resolver);
    expect(withResolver.getDiagnostics()).toEqual([]);
    const without = await loadTsEditorSupport('imports-noresolver.ts', content, undefined, '', null);
    expect(without.getDiagnostics()).toEqual([]);
    expect(calls.filter((c) => c.startsWith('imports-noresolver.ts'))).toEqual([]);
  }, 30000);

  it('fetches an import added after the environment was built (refreshImports)', async () => {
    const support = await loadTsEditorSupport('imports-late.ts', 'log(1);\n', undefined, '', resolver);
    expect(calls).toEqual([]);
    const edited = 'import { takesString } from "./lib/strings.ts";\nlog(takesString(42));\n';
    support.reseed(edited);
    expect(await support.refreshImports(edited)).toBe(true);
    expect(support.getDiagnostics().map((d) => d.line)).toEqual([2]);
    // nothing new the second time
    expect(await support.refreshImports(edited)).toBe(false);
  }, 30000);
});
