import { type DashboardsStore } from '@/stores/dashboards';
import { type DevicesStore } from '@/stores/devices';

export interface EditSvgDashboardPageProps {
  dashboardsStore: DashboardsStore;
  devicesStore: DevicesStore;
  openPage: (page: string, params?: any) => void;
}
