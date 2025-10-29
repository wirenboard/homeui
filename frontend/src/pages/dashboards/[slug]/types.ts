import { DashboardsStore } from '@/stores/dashboards';
import { DeviceStore } from '@/stores/device';

export interface DashboardPageProps {
  dashboardsStore: DashboardsStore;
  devicesStore: DeviceStore;
}
