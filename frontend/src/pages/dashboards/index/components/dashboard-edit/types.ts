import { Dashboard } from '@/stores/dashboards';

export interface DashboardEditProps {
  dashboard: Dashboard;
  dashboards: Dashboard[];
  isOpened: boolean;
  onClose: () => void;
  onSave: (_data: any, _isNew?: boolean) => void;
}
