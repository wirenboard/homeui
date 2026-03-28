import { makeAutoObservable, runInAction } from 'mobx';
import { uiConfigPath } from '@/common/paths';
import type { DashboardBase, UIConfigResponse, WidgetBase } from '@/stores/dashboards';
import { generateNextId } from '@/utils/id';
import { logAction } from '@/utils/logAction';
import i18n from '~/i18n/react/config';
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
  #configEditorProxy: any;

  constructor(configEditorProxy: any) {
    this.#configEditorProxy = configEditorProxy;

    makeAutoObservable(this, {}, { autoBind: true });
  }

  loadData() {
    this.isLoading = true;
    return this.#configEditorProxy.Load({ path: uiConfigPath })
      .then(({ content }: UIConfigResponse) => {
        const { dashboards, widgets, defaultDashboardId, isShowWidgetsPage, description } = content;
        return runInAction(() => {
          this.isLoading = false;
          dashboards.forEach((dashboard: DashboardBase) => {
            this.dashboards.set(dashboard.id, new Dashboard(dashboard, this));
          });
          widgets.forEach((widget: WidgetBase) => {
            this.widgets.set(widget.id, new Widget(widget, this));
          });
          this.defaultDashboardId = defaultDashboardId;
          this.isShowWidgetsPage = !!isShowWidgetsPage;
          this.description = description || '';

          return content;
        });
      });
  }

  async addDashboard(data: Dashboard) {
    this.dashboards.set(data.id, new Dashboard(data, this));
    logAction({ action: 'add_dashboard', name: data.name || data.id }, 'Dashboard');

    this._saveData();
  }

  async updateDashboard(id: string, data: Dashboard) {
    // Read the old name before modifying the dashboards map
    const oldName = this.dashboards.get(id)?.name || id;

    if (id === data.id) {
      this.dashboards.set(id, new Dashboard(data, this));
    } else {
      // Dashboard id changed - remove old entry and add new one
      this.dashboards.set(data.id, new Dashboard(data, this));
      this.dashboards.delete(id);
    }

    // Log only structural changes (id/name change); visibility and content changes are logged by the caller
    if (id !== data.id) {
      logAction({ action: 'change_dashboard_id', old_id: id, new_id: data.id }, 'Dashboard');
    } else if (oldName !== (data.name || data.id)) {
      logAction({ action: 'rename_dashboard', old_name: oldName, new_name: data.name || data.id }, 'Dashboard');
    }

    this._saveData();
  }

  async updateDashboards(data: Dashboard[]) {
    this.dashboards = new Map(data.map((dashboard) => [dashboard.id, new Dashboard(dashboard, this)]));
    logAction({ action: 'reorder_dashboards' }, 'Dashboard');
    this._saveData();
  }

  async deleteDashboard(id: string) {
    const dashboardName = this.dashboards.get(id)?.name || id;
    this.dashboards.delete(id);
    logAction({ action: 'delete_dashboard', name: dashboardName }, 'Dashboard');
    this._saveData();
  }

  addWidgetToDashboard(dashboardId: string, widgetId: string) {
    runInAction(() => {
      const dashboard = this.dashboards.get(dashboardId);
      dashboard.widgets.push(widgetId);
      this.dashboards.set(dashboardId, new Dashboard(dashboard, this));
      const widgetName = this.widgets.get(widgetId)?.name || widgetId;
      logAction({ action: 'add_widget_to_dashboard', widget_name: widgetName, dashboard_name: dashboard.name || dashboardId }, 'Dashboard');
      this._saveData();
    });
  }

  removeWidgetFromDashboard(dashboardId: string, widgetId: string, withSave = true) {
    runInAction(() => {
      const widgetName = this.widgets.get(widgetId)?.name || widgetId;
      const dashboard = this.dashboards.get(dashboardId);
      dashboard.widgets = dashboard.widgets.filter((widget) => widget !== widgetId);
      this.dashboards.set(dashboardId, new Dashboard(dashboard, this));
      if (withSave) {
        logAction({ action: 'remove_widget_from_dashboard', widget_name: widgetName, dashboard_name: dashboard.name || dashboardId }, 'Dashboard');
        this._saveData();
      }
    });
  }

  copyWidget(widgetId: string) {
    return runInAction(() => {
      const id = generateNextId(Array.from(this.widgets.keys()), 'widget');
      const copiedWidget = this.widgets.get(widgetId);
      this.widgets.set(id, new Widget({ ...copiedWidget, id, name: `${copiedWidget.name}_copy` }, this));
      logAction({ action: 'copy_widget', name: copiedWidget.name || widgetId }, 'Dashboard');
      this._saveData();
      return id;
    });
  }

  updateWidget(widget: WidgetBase) {
    this.widgets.set(widget.id, new Widget(widget, this));
    logAction({ action: 'edit_widget', name: widget.name || widget.id }, 'Dashboard');
    this._saveData();
  }

  deleteWidget(widgetId: string) {
    runInAction(() => {
      const widgetName = this.widgets.get(widgetId)?.name || widgetId;
      this.dashboards.forEach((dashboard) => {
        if (dashboard.hasWidget(widgetId)) {
          this.removeWidgetFromDashboard(dashboard.id, widgetId, false);
        }
      });
      this.widgets.delete(widgetId);
      logAction({ action: 'delete_widget', name: widgetName }, 'Dashboard');
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

    await this.#configEditorProxy.Save({ path: uiConfigPath, content })
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
