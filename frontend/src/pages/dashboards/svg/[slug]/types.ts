import { type SvgDashboardPageStore } from '@/pages/dashboards/svg/[slug]';

export interface SvgDashboardPageProps {
  store: SvgDashboardPageStore;
}

export type MoveToDashboardFn = (dashboardId: string, sourceDashboardId: string) => void;
