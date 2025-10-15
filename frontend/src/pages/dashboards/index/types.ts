import { DashboardsStore } from '@/stores/dashboards';

export interface DashboardListPageProps {
  dashboardsStore: DashboardsStore;
  hasEditRights: boolean;
}
