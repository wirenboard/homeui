import { type Option } from '@/components/dropdown';

export interface TabListThumbDrag {
  list: HTMLElement;
  thumb: HTMLElement;
  startY: number;
  startScrollTop: number;
}

export interface JsonEditorProps {
  schema: any;
  data: any;
  root?: string;
  className?: string;
  cells?: Option<string>[];
  onChange: (_val: any, _errors: any[]) => void;
}
