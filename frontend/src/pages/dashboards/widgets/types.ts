import { type DashboardsStore } from '@/stores/dashboards';
import { type DeviceStore } from '@/stores/device';

export interface WidgetsPageProps {
  store: DashboardsStore;
  devicesStore: DeviceStore;
}

export enum PageView {
  List = 'list',
  Card = 'card',
}
