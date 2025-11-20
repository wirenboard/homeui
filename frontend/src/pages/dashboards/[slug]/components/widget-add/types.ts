import { type Dashboard, type Widget } from '@/stores/dashboards';
import type DashboardsStore from '@/stores/dashboards/dashboards-store';
import { type Cell } from '@/stores/device';

export interface WidgetAddProps {
  dashboard: Dashboard;
  dashboardsStore: DashboardsStore;
  widgets: Map<string, Widget>;
  cells: Map<string, Cell>;
  isOpened: boolean;
  controls: any;
  onClose: () => void;
}
