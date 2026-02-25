import { type Widget } from '@/stores/dashboards/widget';
import { type Cell } from '@/stores/devices';

export interface CellSimple {
  id: string;
  name: string;
  type: string;
  extra: {
    invert?: boolean;
  };
}

export interface WidgetEditProps {
  widget: Widget;
  cells: Map<string, Cell | CellSimple>;
  isOpened: boolean;
  controls: any;
  onClose: () => void;
  onSave: (data: any) => void;
}
