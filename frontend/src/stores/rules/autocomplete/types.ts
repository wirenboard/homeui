import type { CompletionSource } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import type { EditorView, ViewUpdate } from '@codemirror/view';
import type { VirtualTypeScriptEnvironment } from '@typescript/vfs';
import type ts from 'typescript';
import type { LocalTsDiag, TsCheckDiag } from '../types';

// the typescript namespace as a value; a type-only import is erased, keeping the package in the lazy chunk
export type TsModule = typeof ts;

export interface TsEditorSupport {
  extensions: Extension[];
  completionSource: CompletionSource;
  getDiagnostics: () => LocalTsDiag[];
  reseed: (content: string) => void;
  // fetch any imports of `source` not yet in the environment (see
  // module-resolution.ts); resolves to whether anything was added
  refreshImports: (source: string) => Promise<boolean>;
}

export interface ControllerVerdict {
  diags: TsCheckDiag[];
  // the editor content the verdict was computed for; null = unknown
  checkedContent: string | null;
}

export interface RuntimeErrorLocation {
  path: string;
  line: number;
}

// the in-band error of Editor.Save / Editor.Load (see load-error.ts)
export interface RuleLoadError {
  message: string;
  errorLine?: number | null;
}

// re-runs the editor's lint sources from an outside event (see lint-refresh.ts)
export interface LintRefresher {
  needsRefresh: (update: ViewUpdate) => boolean;
  // must not be called synchronously inside a view update or plugin constructor
  refresh: (view: EditorView) => void;
}

// structural view of the devices store, so registry.ts does not import the store module (i18n/localStorage init)
export interface CellLike {
  id: string;
  type: string;
  isSystem: boolean;
}
export interface DeviceCells {
  // optional: a store without cells yet must not break editor loading
  cells?: Map<string, CellLike>;
}

// a module file resolved by the controller (Editor.ResolveModule), see
// module-resolution.ts
export interface ResolvedModule {
  // absolute path of the module file on the controller - the `from` for the
  // module's own imports
  path: string;
  content: string;
}

// resolves `specifier` as written in `from` (a rule's virtual path or a
// module's absolute path); null when the controller cannot resolve it
export type ModuleResolver = (from: string, specifier: string) => Promise<ResolvedModule | null>;

// the modules fetched for one language-service environment
export interface ImportGraph {
  // virtual FS path -> source, for every module fetched so far
  files: Map<string, string>;
  // `from\0specifier` pairs already asked (including failed ones)
  asked: Set<string>;
}

export interface PrefetchOptions {
  maxFiles?: number;
  maxDepth?: number;
  // wall-clock bound for one prefetch run (ms); imports still unresolved
  // when it elapses are left to the wildcard fallback
  deadlineMs?: number;
}

// the imports of one language-service environment, see createImportSet
export interface ImportSet {
  // fetch the imports of `source` (transitively); the files collected so far
  prefetch: (source: string) => Promise<Map<string, string>>;
  // fetch imports of `source` not yet known and add them to `env`; whether
  // anything was added
  refresh: (env: VirtualTypeScriptEnvironment, source: string) => Promise<boolean>;
}
