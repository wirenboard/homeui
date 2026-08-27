import {
  importSpecifiers,
  joinVfs,
  MODULES_ROOT,
  newImportGraph,
  prefetchImports,
  vfsPathFor,
} from './module-resolution';
import type { ModuleResolver, ResolvedModule } from './types';

describe('importSpecifiers', () => {
  it('finds static, side-effect, dynamic and require specifiers once each, in order', () => {
    const src = [
      'import a from "x";',
      'import { b, c } from \'./lib/y.ts\';',
      'import * as ns from "dir/z";',
      'export { d } from "../up";',
      'export * from "x";', // repeated: once
      'import "side-effect";',
      'const m = await import("dyn");',
      'const r = require(\'cjs-mod\');',
      'log("not from \\"nope\\"");',
    ].join('\n');
    expect(importSpecifiers(src)).toEqual([
      'x', './lib/y.ts', 'dir/z', '../up', 'side-effect', 'dyn', 'cjs-mod',
    ]);
  });

  it('ignores import.meta and identifiers merely named import', () => {
    expect(importSpecifiers('log(import.meta.filename); const importer = 1;')).toEqual([]);
  });
});

describe('vfs placement', () => {
  it('joins and normalises paths', () => {
    expect(joinVfs('/a/b', '../c/./d')).toBe('/a/c/d');
    expect(joinVfs('/', 'x')).toBe('/x');
    expect(joinVfs('/a', '../../x')).toBe('/x');
  });

  it('places relative imports next to the importer with the resolved extension', () => {
    expect(vfsPathFor('/rules/a.ts', './lib', '/etc/wb-rules/lib.ts')).toBe('/rules/lib.ts');
    expect(vfsPathFor('/rules/a.ts', './lib.js', '/etc/wb-rules/lib.ts')).toBe('/rules/lib.ts');
    expect(vfsPathFor('/a.js', './esmlib/sib.js', '/etc/wb-rules/esmlib/sib.js')).toBe('/esmlib/sib.js');
    expect(vfsPathFor('/rules/sub/a.ts', '../x', '/etc/wb-rules/rules/x.js')).toBe('/rules/x.js');
  });

  it('places bare imports under the modules root, mirroring the specifier', () => {
    expect(vfsPathFor('/a.ts', 'test/esm/typed', '/etc/wb-rules-modules/test/esm/typed.ts'))
      .toBe(MODULES_ROOT + '/test/esm/typed.ts');
    expect(vfsPathFor('/a.ts', 'x.mod', '/usr/share/wb-rules-modules/x.mod.js'))
      .toBe(MODULES_ROOT + '/x.mod.js');
    // a module's own relative import lands consistently
    expect(vfsPathFor(MODULES_ROOT + '/test/esm/helper.js', './util.js', '/etc/wb-rules-modules/test/esm/util.js'))
      .toBe(MODULES_ROOT + '/test/esm/util.js');
  });

  it('keeps absolute imports at their path', () => {
    expect(vfsPathFor('/a.ts', '/opt/x.js', '/opt/x.js')).toBe('/opt/x.js');
  });
});

describe('prefetchImports', () => {
  const files: Record<string, ResolvedModule> = {
    'a.ts\0./lib.ts': { path: '/etc/wb-rules/lib.ts', content: 'import { u } from "util"; export const l = u;' },
    '/etc/wb-rules/lib.ts\0util': {
      path: '/etc/wb-rules-modules/util.js',
      content: 'import "./deep.js"; export const u = 1;',
    },
    '/etc/wb-rules-modules/util.js\0./deep.js': { path: '/etc/wb-rules-modules/deep.js', content: 'export {};' },
  };
  const calls: string[] = [];
  const resolver: ModuleResolver = async (from, spec) => {
    calls.push(from + ' ' + spec);
    return files[from + '\0' + spec] ?? null;
  };

  beforeEach(() => {
    calls.length = 0;
  });

  it('follows imports transitively, placing each file once', async () => {
    const graph = newImportGraph();
    const added = await prefetchImports(
      resolver, graph, '/a.ts', 'a.ts', 'import { l } from "./lib.ts"; import "nope";',
    );
    expect(added).toEqual(['/lib.ts', MODULES_ROOT + '/util.js', MODULES_ROOT + '/deep.js']);
    expect(graph.files.get('/lib.ts')).toContain('export const l');
    expect(calls).toEqual([
      'a.ts ./lib.ts', 'a.ts nope', '/etc/wb-rules/lib.ts util', '/etc/wb-rules-modules/util.js ./deep.js',
    ]);
    // a second run learns nothing new and asks nothing again
    expect(await prefetchImports(resolver, graph, '/a.ts', 'a.ts', 'import { l } from "./lib.ts";')).toEqual([]);
    expect(calls).toHaveLength(4);
    // a new specifier is fetched incrementally
    files['a.ts\0late'] = { path: '/etc/wb-rules-modules/late.js', content: 'export const late = 1;' };
    expect(await prefetchImports(resolver, graph, '/a.ts', 'a.ts', 'import { late } from "late";'))
      .toEqual([MODULES_ROOT + '/late.js']);
  });

  it('bounds the number of files and the depth', async () => {
    const wide = Array.from({ length: 10 }, (_, i) => `import "m${i}";`).join('\n');
    const many: ModuleResolver = async (_from, spec) => ({ path: `/mods/${spec}.js`, content: '' });
    const graph = newImportGraph();
    const added = await prefetchImports(many, graph, '/a.ts', 'a.ts', wide, { maxFiles: 3 });
    expect(added).toHaveLength(3);

    const chain: ModuleResolver = async (_from, spec) => {
      const n = Number(spec.slice(1));
      return { path: `/mods/${spec}.js`, content: `import "c${n + 1}";` };
    };
    const deep = newImportGraph();
    expect(await prefetchImports(chain, deep, '/a.ts', 'a.ts', 'import "c0";', { maxDepth: 3 }))
      .toEqual([MODULES_ROOT + '/c0.js', MODULES_ROOT + '/c1.js', MODULES_ROOT + '/c2.js']);
  });

  it('treats a throwing resolver as unresolved', async () => {
    const boom: ModuleResolver = async () => {
      throw new Error('rpc down');
    };
    const graph = newImportGraph();
    expect(await prefetchImports(boom, graph, '/a.ts', 'a.ts', 'import "x";')).toEqual([]);
  });
});
