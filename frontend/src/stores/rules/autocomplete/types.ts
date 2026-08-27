import type { CompletionSource } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import type { EditorView, ViewUpdate } from '@codemirror/view';
import type ts from 'typescript';
import type { LocalTsDiag, TsCheckDiag } from '../types';

// the typescript namespace as a value; a type-only import is erased, keeping the package in the lazy chunk
export type TsModule = typeof ts;

export interface TsEditorSupport {
  extensions: Extension[];
  completionSource: CompletionSource;
  getDiagnostics: () => LocalTsDiag[];
  reseed: (content: string) => void;
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
