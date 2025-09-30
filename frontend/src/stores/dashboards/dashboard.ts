import { makeAutoObservable } from 'mobx';
import DashboardsStore from '@/stores/dashboards/dashboards-store';
import { DashboardBase } from './types';

export class Dashboard {
  declare id: string;
  declare name: string;
  declare widgets: string[];
  declare isSvg: boolean;
  declare svg: DashboardBase['svg'];
  declare svg_fullwidth: boolean;
  declare svg_url: string;
  declare swipe: DashboardBase['swipe'];
  declare options: DashboardBase['options'];
  #dashboardStore: DashboardsStore;

  constructor(dashboard: DashboardBase, dashboardStore: DashboardsStore) {
    this.id = dashboard.id;
    this.name = dashboard.name;
    this.widgets = dashboard.widgets || [];
    this.isSvg = dashboard.isSvg || false;
    this.options = dashboard.options || {};

    if (this.isSvg) {
      this.svg = dashboard.svg;
      this.svg_fullwidth = dashboard.svg_fullwidth;
      this.svg_url = dashboard.svg_url;
      this.swipe = dashboard.swipe;
    }
    this.#dashboardStore = dashboardStore;

    makeAutoObservable(this, {
      svg: false,
      svg_fullwidth: false,
      svg_url: false,
      swipe: false,
    }, { autoBind: true });
  }

  hasWidget(id: string) {
    return this.widgets.includes(id);
  }

  addWidget(widgetId: string) {
    this.#dashboardStore.addWidgetToDashboard(this.id, widgetId);
  }

  async delete() {
    return this.#dashboardStore.deleteDashboard(this.id);
  }

  async toggleVisibility() {
    this.options.isHidden = Object.hasOwn(this.options, 'isHidden') ? !this.options.isHidden : true;
    return this.#dashboardStore.updateDashboard(this.id, this);
  }
}
