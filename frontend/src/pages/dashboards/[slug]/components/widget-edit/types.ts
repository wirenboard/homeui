import { Dashboard } from '@/stores/dashboards';
import { Widget } from '@/stores/dashboards/widget';
import { Cell } from '@/stores/device';

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
  dashboard: Dashboard;
  cells: Map<string, Cell | CellSimple>;
  isOpened: boolean;
  controls: any;
  onClose: () => void;
  onSave: (data: any) => void;
}
