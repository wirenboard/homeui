import { type Option } from '@/components/dropdown';
import { type Dashboard, type Widget } from '@/stores/dashboards';
import type DashboardsStore from '@/stores/dashboards/dashboards-store';
import { type Cell } from '@/stores/devices';

export interface WidgetAddProps {
  dashboard: Dashboard;
  dashboardsStore: DashboardsStore;
  widgets: Map<string, Widget>;
  cells: Map<string, Cell>;
  isOpened: boolean;
  topics: Option<string>[];
  onClose: () => void;
}
