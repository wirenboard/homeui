import { DashboardsStore } from '@/stores/dashboards';

export interface DashboardListPageProps {
  dashboardStore: DashboardsStore;
  hasEditRights: boolean;
}
