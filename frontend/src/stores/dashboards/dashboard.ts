import { makeAutoObservable } from 'mobx';
import { dashboardsStore } from '@/stores/dashboards/index';
import { type DashboardBase } from './types';

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

  constructor(dashboard: DashboardBase) {
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
    dashboardsStore.addWidgetToDashboard(this.id, widgetId);
  }

  async delete() {
    return dashboardsStore.deleteDashboard(this.id);
  }

  async toggleVisibility() {
    // Non-optimistic: the store applies the new value locally only after the PATCH succeeds.
    const desired = Object.hasOwn(this.options, 'isHidden') ? !this.options.isHidden : true;
    return dashboardsStore.setDashboardHidden(this.id, desired);
  }
}
