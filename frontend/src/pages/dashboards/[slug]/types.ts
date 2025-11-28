import { type DashboardsStore } from '@/stores/dashboards';
import { type DeviceStore } from '@/stores/device';

export interface DashboardPageProps {
  dashboardsStore: DashboardsStore;
  devicesStore: DeviceStore;
}
