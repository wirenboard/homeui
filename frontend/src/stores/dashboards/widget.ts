import { generateNextId } from '@/utils/id';
import type DashboardsStore from './dashboards-store';
import { type WidgetBase } from './types';

export class Widget {
  declare id: string;
  declare name: string;
  declare description: string;
  declare compact: boolean;
  declare cells: any[];
  #dashboardsStore: DashboardsStore;

  constructor(widget: WidgetBase, dashboardsStore: DashboardsStore) {
    this.id = widget.id;
    this.name = widget.name;
    this.description = widget.description;
    this.compact = widget.compact;
    this.cells = widget.cells;
    this.#dashboardsStore = dashboardsStore;
  }

  save(data: WidgetBase) {
    if (!data.id) {
      data.id = generateNextId(
        Array.from(this.#dashboardsStore.widgets.values()).map((item) => item.id),
        'widget'
      );
    }
    this.#dashboardsStore.updateWidget(data);
  }

  copy() {
    return this.#dashboardsStore.copyWidget(this.id);
  }

  delete(id: string) {
    this.#dashboardsStore.deleteWidget(id);
  }

  get associatedDashboards() {
    return Array.from(this.#dashboardsStore.dashboards.values())
      .filter((dashboard) => dashboard.widgets.includes(this.id));
  }

  get notUsedDashboards() {
    return Array.from(this.#dashboardsStore.dashboards.values())
      .filter((dashboard) => {
        return !dashboard.isSvg && !dashboard.widgets.includes(this.id);
      });
  }
}
