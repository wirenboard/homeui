import { dashboardsStore } from '@/stores/dashboards/index';
import { generateNextId } from '@/utils/id';
import { type WidgetBase } from './types';

export class Widget {
  declare id: string;
  declare name: string;
  declare description: string;
  declare compact: boolean;
  declare cells: any[];

  constructor(widget: WidgetBase) {
    this.id = widget.id;
    this.name = widget.name;
    this.description = widget.description;
    this.compact = widget.compact;
    this.cells = widget.cells;
  }

  save(data: WidgetBase) {
    if (!data.id) {
      data.id = generateNextId(
        Array.from(dashboardsStore.widgets.values()).map((item) => item.id),
        'widget',
      );
    }
    dashboardsStore.updateWidget(data);
  }

  copy() {
    return dashboardsStore.copyWidget(this.id);
  }

  delete(id: string) {
    dashboardsStore.deleteWidget(id);
  }

  get associatedDashboards() {
    return Array.from(dashboardsStore.dashboards.values())
      .filter((dashboard) => dashboard.widgets.includes(this.id));
  }

  get notUsedDashboards() {
    return Array.from(dashboardsStore.dashboards.values())
      .filter((dashboard) => {
        return !dashboard.isSvg && !dashboard.widgets.includes(this.id);
      });
  }
}
