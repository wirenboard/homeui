import type {
  ImportGraph,
  ImportQueueItem,
  ImportSet,
  ModuleResolver,
  PrefetchOptions,
  ResolvedModule,
} from './types';

// Imports in the editor's language service.
//
// A rule file may import modules: bare specifiers ("my-helper", "dir/x")
// from the controller's module directories, relative ones ("./lib/x.ts")
// from next to the file, absolute ones as they are. The language service's
// virtual file system knows none of those files, so every import would fall
// to the `declare module "*"` wildcard: everything `any`, a `type` import an
// error, no completions for the module's exports.
//
// The controller resolves imports itself (Editor.ResolveModule: the engine's
// own resolution, returning the module file's source). This module scans a
// file for its specifiers, asks the resolver for each, places the sources in
// the virtual FS where TypeScript will find them, and follows the modules'
// own imports - bounded in files, depth and time, so a pathological module
// graph or an unresponsive controller cannot stall the editor.
//
// Placement (TypeScript resolves against the virtual FS exactly as against
// a real one, with bundler resolution):
//   - relative:  next to the importing file's virtual path, with the
//                resolved file's real extension (`./lib` -> `lib.ts`);
//   - absolute:  at the real path;
//   - bare:      under MODULES_ROOT mirroring the specifier, mapped by the
//                compiler option `paths: { "*": [MODULES_ROOT + "/*"] }`.
// A module's own relative imports then land where the controller resolves
// them too, because the module directories mirror the specifier structure.

export const MODULES_ROOT = '/wb-rules-modules';

// at most this many module files are fetched for one rule (a wide import
// graph is served partially rather than stalling the editor)
const MAX_MODULE_FILES = 50;
// import chains deeper than this stay unresolved (the wildcard fallback)
const MAX_IMPORT_DEPTH = 8;
// wall-clock bound of one prefetch run
const DEFAULT_DEADLINE_MS = 5000;

// CodeMirror normalizes line endings on ingest, so editor positions are
// LF-based; the language service must hold the same text or every
// diagnostic offset, completion and hover position after line 1 of a CRLF
// file drifts (one character per preceding line)
export const normalizeEol = (s: string) => s.replace(/\r\n/g, '\n');

// Blanks comments out of a source (keeping its length, so match indexes
// stay meaningful) while leaving string and template literals intact: a
// comment inside a multi-line import clause must not hide the import from
// the scan, and a specifier mentioned in a comment must not cost a lookup.
// A lexical pass, not a parser: a regex literal containing a quote or `//`
// can confuse it - the cost is one missed or wasted lookup, never an error.
export function blankComments(source: string): string {
  const out: string[] = [];
  let i = 0;
  const n = source.length;
  while (i < n) {
    const c = source[i];
    const next = source[i + 1];
    if (c === '/' && next === '/') {
      const end = source.indexOf('\n', i);
      const stop = end < 0 ? n : end;
      out.push(' '.repeat(stop - i));
      i = stop;
    } else if (c === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end < 0 ? n : end + 2;
      // newlines kept so line-based reasoning elsewhere still holds
      out.push(source.slice(i, stop).replace(/[^\n]/g, ' '));
      i = stop;
    } else if (c === '"' || c === '\'' || c === '`') {
      let j = i + 1;
      while (j < n && source[j] !== c) {
        if (source[j] === '\\') j++;
        else if (c !== '`' && source[j] === '\n') break; // an unterminated string ends at the line
        j++;
      }
      const stop = Math.min(n, j + 1);
      out.push(source.slice(i, stop));
      i = stop;
    } else {
      out.push(c);
      i++;
    }
  }
  return out.join('');
}

// specifier positions: static import/export ... from "x", side-effect
// import "x", dynamic import("x") and require("x")
const SPECIFIER_RX = [
  /\b(?:import|export)\b[^'"`;]*?\bfrom\s*(['"])([^'"\n]+)\1/g,
  /\bimport\s*(['"])([^'"\n]+)\1/g,
  /\bimport\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g,
  /\brequire\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g,
];

// the import specifiers of a source text, in order of first appearance,
// each once; comments are ignored
export function importSpecifiers(source: string): string[] {
  const code = blankComments(source);
  const found: { index: number; spec: string }[] = [];
  for (const rx of SPECIFIER_RX) {
    for (const m of code.matchAll(rx)) {
      if (m[2]) found.push({ index: m.index, spec: m[2] });
    }
  }
  found.sort((a, b) => a.index - b.index);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { spec } of found) {
    if (seen.has(spec)) continue;
    seen.add(spec);
    out.push(spec);
  }
  return out;
}

const isRelativeSpecifier = (spec: string) => spec.startsWith('./') || spec.startsWith('../');
const isAbsoluteSpecifier = (spec: string) => spec.startsWith('/');

const dirname = (p: string) => {
  const i = p.lastIndexOf('/');
  return i <= 0 ? '/' : p.slice(0, i);
};
const basename = (p: string) => p.slice(p.lastIndexOf('/') + 1);

// POSIX-style join with "." / ".." normalisation, always absolute
export function joinVfs(dir: string, rel: string): string {
  const parts: string[] = [];
  for (const seg of (dir + '/' + rel).split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      parts.pop();
    } else {
      parts.push(seg);
    }
  }
  return '/' + parts.join('/');
}

// where the resolved module goes in the virtual FS, see the header: the
// specifier's directory part as written (so "../x" keeps its "..") plus the
// resolved file's name
export function vfsPathFor(importerVfsPath: string, specifier: string, resolvedPath: string): string {
  if (isAbsoluteSpecifier(specifier)) return resolvedPath;
  const slash = specifier.lastIndexOf('/');
  const rel = (slash < 0 ? '' : specifier.slice(0, slash + 1)) + basename(resolvedPath);
  return joinVfs(isRelativeSpecifier(specifier) ? dirname(importerVfsPath) : MODULES_ROOT, rel);
}

// a well-formed reply: an absolute path and a source text
const isResolvedModule = (r: unknown): r is ResolvedModule =>
  !!r &&
  typeof (r as ResolvedModule).path === 'string' &&
  (r as ResolvedModule).path.startsWith('/') &&
  typeof (r as ResolvedModule).content === 'string';

export const newImportGraph = (rootVfsPath: string): ImportGraph => ({
  root: rootVfsPath,
  files: new Map(),
  asked: new Set(),
});

// Fetches the imports of `source` (a file at `vfsPath`, known to the
// controller as `from`) into `graph`, transitively. Returns the virtual FS
// paths added by this run (an empty array when nothing new was learned).
// Every resolver call is raced against the remaining deadline: a hung
// controller leaves the rest of the imports to the wildcard fallback
// instead of holding the editor.
export async function prefetchImports(
  resolver: ModuleResolver,
  graph: ImportGraph,
  vfsPath: string,
  from: string,
  source: string,
  options: PrefetchOptions = {},
): Promise<string[]> {
  const maxFiles = options.maxFiles ?? MAX_MODULE_FILES;
  const maxDepth = options.maxDepth ?? MAX_IMPORT_DEPTH;
  const deadline = Date.now() + (options.deadlineMs ?? DEFAULT_DEADLINE_MS);
  const added: string[] = [];
  const queue: ImportQueueItem[] = [{ vfsPath, from, source, depth: 0 }];
  while (queue.length > 0) {
    const item = queue.shift()!;
    if (item.depth >= maxDepth) continue;
    for (const spec of importSpecifiers(item.source)) {
      const key = item.from + '\0' + spec;
      if (graph.asked.has(key)) continue;
      const left = deadline - Date.now();
      if (graph.files.size >= maxFiles || left <= 0) return added;
      graph.asked.add(key);
      let resolved: unknown;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        resolved = await Promise.race([
          resolver(item.from, spec),
          new Promise<null>((resolve) => {
            timer = setTimeout(() => resolve(null), left);
          }),
        ]);
      } catch {
        resolved = null;
      }
      clearTimeout(timer);
      if (!isResolvedModule(resolved)) continue;
      const target = vfsPathFor(item.vfsPath, spec, resolved.path);
      // the file under edit is never replaced by its on-disk copy (a cycle
      // back to the rule); a module already placed keeps its first text
      if (target === graph.root || graph.files.has(target)) continue;
      graph.files.set(target, resolved.content);
      added.push(target);
      queue.push({ vfsPath: target, from: resolved.path, source: resolved.content, depth: item.depth + 1 });
    }
  }
  return added;
}

// The imports of one language-service environment (the rule at `vfsPath`,
// known to the controller as `from`): `prefetch` collects them before the
// environment is built, `refresh` adds any new ones to a live environment.
// Without a resolver (legacy firmware) both are no-ops and every import
// falls to the `declare module "*"` any.
export function createImportSet(resolver: ModuleResolver | null, vfsPath: string, from: string): ImportSet {
  const graph = newImportGraph(vfsPath);
  const fetch = async (source: string) => (resolver ? prefetchImports(resolver, graph, vfsPath, from, source) : []);
  return {
    prefetch: async (source) => {
      await fetch(source);
      return graph.files;
    },
    refresh: async (env, source) => {
      const added = await fetch(source);
      for (const modulePath of added) env.createFile(modulePath, normalizeEol(graph.files.get(modulePath)!));
      return added.length > 0;
    },
  };
}
