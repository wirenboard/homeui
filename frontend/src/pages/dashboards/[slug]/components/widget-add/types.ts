import { type Option } from '@/components/dropdown';
import { type Dashboard, type Widget } from '@/stores/dashboards';
import { type Cell } from '@/stores/devices';

export interface WidgetAddProps {
  dashboard: Dashboard;
  widgets: Map<string, Widget>;
  cells: Map<string, Cell>;
  isOpened: boolean;
  topics: Option<string>[];
  onClose: () => void;
}
