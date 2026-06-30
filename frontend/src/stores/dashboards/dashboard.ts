import { makeAutoObservable } from 'mobx';
import { dashboardsStore } from '@/stores/dashboards/index';
import { type DashboardBase } from './types';

function normalizeWidgets(widgets: string[] | string[][] | undefined): string[][] {
  if (!widgets || !widgets.length) {
    return [[]];
  }
  let columns: string[][];
  if (Array.isArray(widgets[0])) {
    columns = (widgets as (string | string[])[]).map((col) =>
      Array.isArray(col) ? col : [col],
    );
  } else {
    columns = [widgets as string[]];
  }
  const seen = new Set<string>();
  return columns.map((col) =>
    col.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  );
}

export class Dashboard {
  declare id: string;
  declare name: string;
  declare widgets: string[][];
  declare isSvg: boolean;
  declare svg: DashboardBase['svg'];
  declare svg_fullwidth: boolean;
  declare svg_url: string;
  declare swipe: DashboardBase['swipe'];
  declare options: DashboardBase['options'];

  constructor(dashboard: DashboardBase) {
    this.id = dashboard.id;
    this.name = dashboard.name;
    this.widgets = normalizeWidgets(dashboard.widgets);
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

  get flatWidgets(): string[] {
    return this.widgets.flat();
  }

  hasWidget(id: string) {
    return this.widgets.some((col) => col.includes(id));
  }

  addWidget(widgetId: string) {
    dashboardsStore.addWidgetToDashboard(this.id, widgetId);
  }

  async delete() {
    return dashboardsStore.deleteDashboard(this.id);
  }

  async toggleVisibility() {
    this.options.isHidden = Object.hasOwn(this.options, 'isHidden') ? !this.options.isHidden : true;
    return dashboardsStore.updateDashboard(this.id, this);
  }
}
