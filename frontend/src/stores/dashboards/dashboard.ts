import DashboardsStore from '@/stores/dashboards/dashboards-store';
import { DashboardBase } from './types';

export class Dashboard {
  declare id: string;
  declare name: string;
  declare widgets: string[];
  declare isSvg: boolean;
  declare svg: any;
  declare svg_fullwidth: boolean;
  declare svg_url: string;
  declare swipe: { enable: boolean; left: any; right: any };
  #dashboardStore: DashboardsStore;

  constructor(dashboard: DashboardBase, dashboardStore: DashboardsStore) {
    this.id = dashboard.id;
    this.name = dashboard.name;
    this.widgets = dashboard.widgets;
    this.isSvg = dashboard.isSvg;
    if (this.isSvg) {
      this.svg = dashboard.svg;
      this.svg_fullwidth = dashboard.svg_fullwidth;
      this.svg_url = dashboard.svg_url;
      this.swipe = dashboard.swipe;
    }
    this.#dashboardStore = dashboardStore;
  }

  hasWidget(id: string) {
    return this.widgets.includes(id);
  }

  addWidget(widgetId: string) {
    this.#dashboardStore.addWidgetToDashboard(this.id, widgetId);
  }
}
