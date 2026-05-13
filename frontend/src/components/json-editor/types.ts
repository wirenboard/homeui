import { type TopicGroup } from '@/stores/devices/types';

export interface JsonEditorProps {
  schema: any;
  data: any;
  root?: string;
  className?: string;
  cells?: TopicGroup[];
  onChange: (_val: any, _errors: any[]) => void;
}
