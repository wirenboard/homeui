import { type SvgDashboardPageStore } from '@/pages/dashboards/svg/[slug]';
import { type DashboardsStore } from '@/stores/dashboards';
import { type DevicesStore } from '@/stores/devices';

export interface SvgDashboardPageProps {
  store: SvgDashboardPageStore;
  dashboardsStore: DashboardsStore;
  devicesStore: DevicesStore;
}

export type MoveToDashboardFn = (dashboardId: string, sourceDashboardId: string) => void;
