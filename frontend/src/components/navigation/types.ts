import { DashboardsStore } from '@/stores/dashboards';
import { RulesStore } from '@/stores/rules';

export interface NavigationProps {
  dashboardsStore: DashboardsStore;
  rulesStore: RulesStore;
  toggleConsole: () => void;
  mqttClient: any;
}
