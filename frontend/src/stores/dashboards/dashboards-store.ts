import { makeAutoObservable, runInAction } from 'mobx';
import { uiConfigPath } from '@/common/paths';
import i18n from '@/i18n/config';
import { configEditorProxy } from '@/services';
import type { DashboardBase, UIConfigResponse, WidgetBase } from '@/stores/dashboards';
import { generateNextId } from '@/utils/id';
import { Dashboard } from './dashboard';
import { Widget } from './widget';

export default class DashboardsStore {
  public dashboards: Map<string, Dashboard> = new Map();
  public widgets: Map<string, Widget> = new Map();
  public isLoading = true;
  public description = '';
  public defaultDashboardId: string;
  public isShowWidgetsPage: boolean = false;
  public saveError: string = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  loadData() {
    this.isLoading = true;
    return configEditorProxy.Load({ path: uiConfigPath })
      .then(({ content }: UIConfigResponse) => {
        const { dashboards, widgets, defaultDashboardId, isShowWidgetsPage, description } = content;
        return runInAction(() => {
          this.isLoading = false;
          dashboards.forEach((dashboard: DashboardBase) => {
            this.dashboards.set(dashboard.id, new Dashboard(dashboard));
          });
          widgets.forEach((widget: WidgetBase) => {
            this.widgets.set(widget.id, new Widget(widget));
          });
          this.defaultDashboardId = defaultDashboardId;
          this.isShowWidgetsPage = !!isShowWidgetsPage;
          this.description = description || '';

          return content;
        });
      });
  }

  async addDashboard(data: Dashboard) {
    this.dashboards.set(data.id, new Dashboard(data));

    this._saveData();
  }

  async updateDashboard(id: string, data: Dashboard) {
    if (id === data.id) {
      this.dashboards.set(id, new Dashboard(data));
    } else {
      this.dashboards.set(data.id, new Dashboard(data));
      this.dashboards.delete(id);
    }

    this._saveData();
  }

  async updateDashboards(data: Dashboard[]) {
    this.dashboards = new Map(data.map((dashboard) => [dashboard.id, new Dashboard(dashboard)]));
    this._saveData();
  }

  async deleteDashboard(id: string) {
    this.dashboards.delete(id);
    this._saveData();
  }

  addWidgetToDashboard(dashboardId: string, widgetId: string) {
    runInAction(() => {
      const dashboard = this.dashboards.get(dashboardId);
      const shortest = dashboard.widgets.reduce(
        (min, col, i) => (col.length < dashboard.widgets[min].length ? i : min),
        0,
      );
      dashboard.widgets[shortest].push(widgetId);
      this.dashboards.set(dashboardId, new Dashboard(dashboard));
      this._saveData();
    });
  }

  removeWidgetFromDashboard(dashboardId: string, widgetId: string, withSave = true) {
    runInAction(() => {
      const dashboard = this.dashboards.get(dashboardId);
      dashboard.widgets = dashboard.widgets.map((col) => col.filter((id) => id !== widgetId));
      this.dashboards.set(dashboardId, new Dashboard(dashboard));
      if (withSave) {
        this._saveData();
      }
    });
  }

  reorderWidgets(dashboardId: string, newColumns: string[][]) {
    runInAction(() => {
      const dashboard = this.dashboards.get(dashboardId);
      dashboard.widgets = newColumns;
      this.dashboards.set(dashboardId, new Dashboard(dashboard));
      this._saveData();
    });
  }

  saveDashboardLayout(dashboardId: string, widgets: string[][], columns: number | undefined) {
    runInAction(() => {
      const dashboard = this.dashboards.get(dashboardId);
      dashboard.widgets = widgets;
      dashboard.options = { ...dashboard.options, columns };
      this.dashboards.set(dashboardId, new Dashboard(dashboard));
      this._saveData();
    });
  }

  setDashboardColumns(dashboardId: string, count: number | undefined) {
    runInAction(() => {
      const dashboard = this.dashboards.get(dashboardId);
      dashboard.options = { ...dashboard.options, columns: count };

      const flat = dashboard.flatWidgets;
      if (count !== undefined) {
        const newColumns: string[][] = Array.from({ length: count }, () => []);
        flat.forEach((id, i) => newColumns[i % count].push(id));
        dashboard.widgets = newColumns;
      } else {
        dashboard.widgets = [flat];
      }

      this.dashboards.set(dashboardId, new Dashboard(dashboard));
      this._saveData();
    });
  }

  copyWidget(widgetId: string) {
    return runInAction(() => {
      const id = generateNextId(Array.from(this.widgets.keys()), 'widget');
      const copiedWidget = this.widgets.get(widgetId);
      this.widgets.set(id, new Widget({ ...copiedWidget, id, name: `${copiedWidget.name}_copy` }));
      this._saveData();
      return id;
    });
  }

  updateWidget(widget: WidgetBase) {
    this.widgets.set(widget.id, new Widget(widget));
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

  setDefaultDashboardId(id: string) {
    runInAction(() => {
      this.defaultDashboardId = id;
      this._saveData();
    });
  }

  setIsShowWidgetsPage(isShow: boolean) {
    runInAction(() => {
      this.isShowWidgetsPage = isShow;
      this._saveData();
    });
  }

  setDescription(description: string) {
    runInAction(() => {
      this.description = description;
      this._saveData();
    });
  }

  get dashboardsList() {
    return Array.from(this.dashboards.values());
  }

  async _saveData() {
    const content = {
      defaultDashboardId: this.defaultDashboardId,
      dashboards: Array.from(this.dashboards.values()),
      widgets: Array.from(this.widgets.values()),
      description: this.description,
      isShowWidgetsPage: this.isShowWidgetsPage,
    };

    await configEditorProxy.Save({ path: uiConfigPath, content })
      .then(() => {
        runInAction(() => {
          this.saveError = null;
        });
      })
      .catch((err: any) => {
        runInAction(() => {
          if (err.name === 'QuotaExceededError') {
            this.saveError = i18n.t('dashboards.errors.overflow');
          } else {
            this.saveError = i18n.t('dashboards.errors.save', { err });
          }
        });
      });
  }
}
