import { type SvgDashboardPageStore } from '@/pages/dashboards/svg/[slug]';
import { type DashboardsStore } from '@/stores/dashboards';
import { type DeviceStore } from '@/stores/device';

export interface SvgDashboardPageProps {
  store: SvgDashboardPageStore;
  dashboardsStore: DashboardsStore;
  devicesStore: DeviceStore;
}

export type MoveToDashboardFn = (dashboardId: string, sourceDashboardId: string) => void;
