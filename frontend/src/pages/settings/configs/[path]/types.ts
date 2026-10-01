export interface JsonSchemaConfigEditorProps {
  schema: any;
  data: any;
  onChange: (content: any, errors: unknown[]) => void;
}
