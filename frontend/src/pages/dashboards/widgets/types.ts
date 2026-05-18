import { type DashboardsStore } from '@/stores/dashboards';
import { type DevicesStore } from '@/stores/devices';

export interface WidgetsPageProps {
  store: DashboardsStore;
  devicesStore: DevicesStore;
}

export enum PageView {
  List = 'list',
  Card = 'card',
}
