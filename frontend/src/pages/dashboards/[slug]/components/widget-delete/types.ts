import { type Dashboard } from '@/stores/dashboards';

export interface WidgetDeleteProps {
  name: string;
  isOpened: boolean;
  associatedDashboards: Dashboard[];
  onClose: () => void;
  onDelete: () => void;
}
