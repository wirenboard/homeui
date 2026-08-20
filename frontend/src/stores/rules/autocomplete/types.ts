import type { CompletionSource } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import type { EditorView, ViewUpdate } from '@codemirror/view';
import type ts from 'typescript';
import type { LocalTsDiag, TsCheckDiag } from '../types';

// the typescript module namespace, passed around as a value so the heavy
// package stays inside the lazily imported editor chunk (a type-only
// import here is erased at compile time)
export type TsModule = typeof ts;

export interface TsEditorSupport {
  extensions: Extension[];
  completionSource: CompletionSource;
  getDiagnostics: () => LocalTsDiag[];
  // reseed the language service's copy of the file (a reopened editor
  // starts from the stored content, not from what was typed and discarded)
  reseed: (content: string) => void;
}

export interface ControllerVerdict {
  diags: TsCheckDiag[];
  // the editor content the verdict was computed for; null = unknown
  checkedContent: string | null;
}

// a "path:line" reference parsed out of an engine console message
// (see runtime-error-parse.ts)
export interface RuntimeErrorLocation {
  path: string;
  line: number;
}

// the in-band error of Editor.Save / Editor.Load: a syntax error or an
// exception thrown while the file was being loaded (see load-error.ts)
export interface RuleLoadError {
  message: string;
  errorLine?: number | null;
}

// re-runs the editor's lint sources from an outside event (see lint-refresh.ts)
export interface LintRefresher {
  // pass as `linter(source, { needsRefresh })`
  needsRefresh: (update: ViewUpdate) => boolean;
  // queue and run a lint pass now (safe to call from a timer/reaction; must
  // not be called synchronously inside a view update or plugin constructor)
  refresh: (view: EditorView) => void;
}

// Structural view of what the controls registry needs from the devices
// store, so a pure string builder doesn't drag in the whole store module
// (and its i18n / localStorage init) at import time (see registry.ts).
export interface CellLike {
  id: string;
  type: string;
  isSystem: boolean;
}
export interface DeviceCells {
  // optional: a store that hasn't populated its cells yet must not make
  // the registry builder throw and break editor loading
  cells?: Map<string, CellLike>;
}
