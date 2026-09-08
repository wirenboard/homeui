import { type Option } from '@/components/dropdown';

export interface JsonEditorProps {
  schema: any;
  data: any;
  root?: string;
  className?: string;
  cells?: Option<string>[];
  onChange: (_val: any, _errors: any[]) => void;
}

export interface TabListThumbDrag {
  list: HTMLElement;
  scrollbar: HTMLElement;
  thumb: HTMLElement;
  startY: number;
  startScrollTop: number;
}
