import { DashboardsStore } from '@/stores/dashboards';
import { DeviceStore } from '@/stores/device';

export interface DashboardPageProps {
  dashboardStore: DashboardsStore;
  devicesStore: DeviceStore;
}
