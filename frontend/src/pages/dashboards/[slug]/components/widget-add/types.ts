import { Dashboard, Widget } from '@/stores/dashboards';
import { Cell } from '@/stores/device';

export interface WidgetAddProps {
  dashboard: Dashboard;
  widgets: Map<string, Widget>;
  cells: Map<string, Cell>;
  isOpened: boolean;
  controls: any;
  onClose: () => void;
}
