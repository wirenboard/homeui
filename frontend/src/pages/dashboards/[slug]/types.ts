import { type DashboardsStore } from '@/stores/dashboards';
import { type DevicesStore } from '@/stores/devices';

export interface DashboardPageProps {
  dashboardsStore: DashboardsStore;
  devicesStore: DevicesStore;
}
