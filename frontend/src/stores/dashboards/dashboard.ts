import DashboardsStore from '@/stores/dashboards/dashboards-store';
import { DashboardBase } from './types';

export class Dashboard {
  declare id: string;
  declare name: string;
  declare widgets: string[];
  declare isSvg: boolean;
  #dashboardStore: DashboardsStore;

  constructor(dashboard: DashboardBase, dashboardStore: DashboardsStore) {
    this.id = dashboard.id;
    this.name = dashboard.name;
    this.widgets = dashboard.widgets;
    this.isSvg = dashboard.isSvg;
    this.#dashboardStore = dashboardStore;
  }

  hasWidget(id: string) {
    return this.widgets.includes(id);
  }

  addWidget(widgetId: string) {
    this.#dashboardStore.addWidgetToDashboard(this.id, widgetId);
  }

  removeWidget(widgetId: string) {
    this.#dashboardStore.removeWidgetFromDashboard(this.id, widgetId);
  }
}
