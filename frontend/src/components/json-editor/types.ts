import { type Option } from '@/components/dropdown';

/** A json-editor editor that draws tabs, as the library builds it */
export interface TabbedEditor {
  tabs_holder?: HTMLElement;
  parent?: TabbedEditor;
}

/** The part of a json-editor instance the tab layout reads */
export interface TabbedEditorRegistry {
  editors?: Record<string, TabbedEditor>;
}

export interface JsonEditorProps {
  schema: any;
  data: any;
  root?: string;
  className?: string;
  cells?: Option<string>[];
  onChange: (_val: any, _errors: any[]) => void;
}
