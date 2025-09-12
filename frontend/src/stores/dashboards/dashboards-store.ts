import { makeAutoObservable, runInAction } from 'mobx';
import { uiConfigPath } from '@/common/paths';
import type { DashboardBase, UIConfigResponse, WidgetBase } from '@/stores/dashboards/types';
import { generateNextId } from '@/utils/id';
import { Dashboard } from './dashboard';
import { Widget } from './widget';

export default class DashboardsStore {
  public dashboards: Map<string, Dashboard> = new Map();
  public widgets: Map<string, Widget> = new Map();
  public isLoading = true;
  declare defaultDashboardId: string;
  #configEditorProxy: any;

  constructor(configEditorProxy: any) {
    this.#configEditorProxy = configEditorProxy;

    makeAutoObservable(this, {}, { autoBind: true });
  }

  loadData() {
    this.isLoading = true;
    return this.#configEditorProxy.Load({ path: uiConfigPath })
      .then(({ content }: UIConfigResponse) => {
        const { dashboards, widgets, defaultDashboardId } = content;

        return runInAction(() => {
          this.isLoading = false;
          dashboards.forEach((dashboard: DashboardBase) => {
            this.dashboards.set(dashboard.id, new Dashboard(dashboard, this));
          });
          widgets.forEach((widget: WidgetBase) => {
            this.widgets.set(widget.id, new Widget(widget, this));
          });
          this.defaultDashboardId = defaultDashboardId;
        });
      });
  }

  addWidgetToDashboard(dashboardId: string, widgetId: string) {
    runInAction(() => {
      const dashboard = this.dashboards.get(dashboardId);
      dashboard.widgets.push(widgetId);
      this.dashboards.set(dashboardId, new Dashboard(dashboard, this));
      this._saveData();
    });
  }

  removeWidgetFromDashboard(dashboardId: string, widgetId: string, withSave = true) {
    runInAction(() => {
      const dashboard = this.dashboards.get(dashboardId);
      dashboard.widgets = dashboard.widgets.filter((widget) => widget !== widgetId);
      this.dashboards.set(dashboardId, new Dashboard(dashboard, this));
      if (withSave) {
        this._saveData();
      }
    });
  }

  copyWidget(widgetId: string) {
    return runInAction(() => {
      const id = generateNextId(Array.from(this.widgets.keys()), 'widget');
      const copiedWidget = this.widgets.get(widgetId);
      this.widgets.set(id, new Widget({ ...copiedWidget, id, name: `${copiedWidget.name}_copy` }, this));
      this._saveData();
      return id;
    });
  }

  updateWidget(widget: WidgetBase) {
    this.widgets.set(widget.id, new Widget(widget, this));
    this._saveData();
  }

  deleteWidget(widgetId: string) {
    runInAction(() => {
      this.dashboards.forEach((dashboard) => {
        if (dashboard.hasWidget(widgetId)) {
          this.removeWidgetFromDashboard(dashboard.id, widgetId, false);
        }
      });
      this.widgets.delete(widgetId);
      this._saveData();
    });
  }

  setLoading(value: boolean) {
    runInAction(() => {
      this.isLoading = value;
    });
  }

  _saveData() {
    this.#configEditorProxy.Save({
      path: uiConfigPath,
      content: {
        defaultDashboardId: this.defaultDashboardId,
        dashboards: Array.from(this.dashboards.values()),
        widgets: Array.from(this.widgets.values()),
      },
    });
  }
}
