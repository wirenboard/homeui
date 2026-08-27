import { type EditorState, type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { type BasicSetupOptions } from '@uiw/react-codemirror';

// problem totals reported by the diagnostics counter (see diagnostics-ux.ts)
export interface DiagnosticCounts {
  errors: number;
  warnings: number;
  total: number;
}

export interface CodeEditorProps {
  text: string;
  errorLines?: number[] | null;
  autoFocus?: boolean;
  extensions: Extension[];
  withBreakpoints?: boolean;
  basicSetup?: boolean | BasicSetupOptions;
  onChange: (_val: string) => void;
  onSave?: () => void;
  onCreateEditor?: (_view: EditorView, _state: EditorState) => void;
}
