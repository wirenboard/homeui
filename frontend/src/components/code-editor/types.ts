import { Extension } from '@codemirror/state';

export interface CodeEditorProps {
  text: string;
  errorLines?: number[] | null;
  autoFocus?: boolean;
  extensions: Extension[];
  onChange: (_val: string) => void;
  onSave?: () => void;
}
