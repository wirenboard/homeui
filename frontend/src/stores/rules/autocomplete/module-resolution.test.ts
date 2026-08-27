import {
  blankComments,
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

  it('keeps document order across the specifier forms', () => {
    expect(importSpecifiers('import "sfx";\nimport a from "m";\nconst d = await import("dyn");'))
      .toEqual(['sfx', 'm', 'dyn']);
  });

  it('ignores import.meta and identifiers merely named import', () => {
    expect(importSpecifiers('log(import.meta.filename); const importer = 1;')).toEqual([]);
  });

  it('sees through comments inside a multi-line import clause and ignores commented-out imports', () => {
    const src = [
      'import {',
      '  // don\'t use this one; it\'s slow',
      '  helper, /* the "good" one */',
      '} from "utils";',
      '// import x from "commented-out";',
      '/* import y from "also-out"; */',
      'const u = "http://example.com/"; import z from "after-url";',
      '',
    ].join('\n');
    expect(importSpecifiers(src)).toEqual(['utils', 'after-url']);
  });
});

describe('blankComments', () => {
  it('blanks comments, keeps strings and the text length', () => {
    const src = 'a // c\nb /* d\ne */ f "s//t" \'q/*r\' `t//u`';
    const out = blankComments(src);
    expect(out).toHaveLength(src.length);
    expect(out).toBe('a     \nb     \n     f "s//t" \'q/*r\' `t//u`');
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
    const graph = newImportGraph('/a.ts');
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
    const graph = newImportGraph('/a.ts');
    const added = await prefetchImports(many, graph, '/a.ts', 'a.ts', wide, { maxFiles: 3 });
    expect(added).toHaveLength(3);

    const chain: ModuleResolver = async (_from, spec) => {
      const n = Number(spec.slice(1));
      return { path: `/mods/${spec}.js`, content: `import "c${n + 1}";` };
    };
    const deep = newImportGraph('/a.ts');
    expect(await prefetchImports(chain, deep, '/a.ts', 'a.ts', 'import "c0";', { maxDepth: 3 }))
      .toEqual([MODULES_ROOT + '/c0.js', MODULES_ROOT + '/c1.js', MODULES_ROOT + '/c2.js']);
  });

  it('treats a throwing resolver and a malformed reply as unresolved', async () => {
    const boom: ModuleResolver = async () => {
      throw new Error('rpc down');
    };
    expect(await prefetchImports(boom, newImportGraph('/a.ts'), '/a.ts', 'a.ts', 'import "x";')).toEqual([]);
    const junk: ModuleResolver = async (_from, spec) => (spec === 'nopath'
      ? ({ content: 'x' } as ResolvedModule)
      : ({ path: 'relative/x.js', content: 'x' }));
    expect(await prefetchImports(junk, newImportGraph('/a.ts'), '/a.ts', 'a.ts', 'import "nopath"; import "rel";'))
      .toEqual([]);
  });

  it('bounds the wall clock: a hung resolver is abandoned at the deadline', async () => {
    const hung: ModuleResolver = () => new Promise(() => {});
    const started = Date.now();
    expect(await prefetchImports(hung, newImportGraph('/a.ts'), '/a.ts', 'a.ts', 'import "x"; import "y";', {
      deadlineMs: 50,
    })).toEqual([]);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('never replaces the file under edit with its on-disk copy (an import cycle back to the rule)', async () => {
    const cyc: ModuleResolver = async (_from, spec) => (spec === './circ.ts'
      ? { path: '/etc/wb-rules/circ.ts', content: 'import { a } from "./self.ts"; export const c = a;' }
      : { path: '/etc/wb-rules/self.ts', content: 'ON DISK' });
    const graph = newImportGraph('/self.ts');
    expect(await prefetchImports(cyc, graph, '/self.ts', 'self.ts', 'import { c } from "./circ.ts";'))
      .toEqual(['/circ.ts']);
    expect(graph.files.has('/self.ts')).toBe(false);
  });
});
