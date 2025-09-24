import { Dashboard, Widget } from '@/stores/dashboards';
import DashboardsStore from '@/stores/dashboards/dashboards-store';
import { Cell } from '@/stores/device';

export interface WidgetAddProps {
  dashboard: Dashboard;
  dashboardStore: DashboardsStore;
  widgets: Map<string, Widget>;
  cells: Map<string, Cell>;
  isOpened: boolean;
  controls: any;
  onClose: () => void;
}
