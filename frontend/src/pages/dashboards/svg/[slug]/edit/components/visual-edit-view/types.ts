import { type DashboardsStore } from '@/stores/dashboards';
import { type DeviceOption } from '@/stores/devices/types';
import { type EditSvgDashboardPageStore } from '../../stores/store';

export interface VisualEditViewProps {
  store: EditSvgDashboardPageStore;
  dashboardsStore: DashboardsStore;
  devices: DeviceOption[];
}
