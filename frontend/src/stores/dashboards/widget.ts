import { generateNextId } from '@/utils/id';
import DashboardsStore from './dashboards-store';
import { WidgetBase } from './types';

export class Widget {
  declare id: string;
  declare name: string;
  declare description: string;
  declare compact: boolean;
  declare cells: any[];
  #dashboardStore: DashboardsStore;

  constructor(widget: WidgetBase, dashboardStore: DashboardsStore) {
    this.id = widget.id;
    this.name = widget.name;
    this.description = widget.description;
    this.compact = widget.compact;
    this.cells = widget.cells;
    this.#dashboardStore = dashboardStore;
  }

  save(data: WidgetBase) {
    if (!data.id) {
      data.id = generateNextId(
        Array.from(this.#dashboardStore.widgets.values()).map((item) => item.id),
        'widget'
      );
    }
    this.#dashboardStore.updateWidget(data);
  }

  copy() {
    return this.#dashboardStore.copyWidget(this.id);
  }

  delete(id: string) {
    this.#dashboardStore.deleteWidget(id);
  }

  get associatedDashboards() {
    return Array.from(this.#dashboardStore.dashboards.values())
      .filter((dashboard) => dashboard.widgets.includes(this.id));
  }
}
