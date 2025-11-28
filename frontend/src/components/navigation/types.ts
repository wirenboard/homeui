import { type DashboardsStore } from '@/stores/dashboards';
import { type RulesStore } from '@/stores/rules';

export interface NavigationProps {
  dashboardsStore: DashboardsStore;
  rulesStore: RulesStore;
  toggleConsole: () => void;
  mqttClient: any;
}
