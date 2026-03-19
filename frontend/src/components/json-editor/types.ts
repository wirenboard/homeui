export interface JsonEditorProps {
  schema: any;
  data: any;
  root?: string;
  className?: string;
  cells?: string[];
  onChange: (_val: any, _errors: any[]) => void;
}
