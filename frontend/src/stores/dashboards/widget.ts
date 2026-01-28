import { generateNextId } from '@/utils/id';
import i18n from '~/i18n/react/config';
import type DashboardsStore from './dashboards-store';
import { type WidgetBase } from './types';

export class Widget {
  declare id: string;
  declare name: string | Record<string, string>;
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

  get localizedName() {
    if (!this.name) {
      return '';
    }
    return typeof this.name === 'string' ? this.name : this.name[i18n.language];
  }

  get associatedDashboards() {
    return Array.from(this.#dashboardsStore.dashboards.values())
      .filter((dashboard) => dashboard.widgets.includes(this.id));
  }
}
