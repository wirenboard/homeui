import { makeAutoObservable, runInAction } from 'mobx';
import i18n from '@/i18n/config';
import type { DashboardBase, DashboardSaveResult, DashboardsConfig, WidgetBase } from '@/stores/dashboards';
import { generateNextId } from '@/utils/id';
import { dashboardsApi } from './api';
import { Dashboard } from './dashboard';
import { Widget } from './widget';

export default class DashboardsStore {
  // --- Observable state ---
  public dashboards: Map<string, Dashboard> = new Map();
  public widgets: Map<string, Widget> = new Map();
  public isLoading = true;
  public description = '';
  public defaultDashboardId: string | null = null;
  public isShowWidgetsPage: boolean = false;
  public saveError: string = null;
  public loadError: string = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  loadData() {
    this.isLoading = true;
    this.loadError = null;
    return dashboardsApi.getDashboards()
      .then((config: DashboardsConfig) => {
        const { dashboards, widgets, defaultDashboardId, isShowWidgetsPage, description } = config;
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

          return config;
        });
      })
      .catch(() => {
        runInAction(() => {
          this.isLoading = false;
          this.loadError = i18n.t('dashboards.errors.load');
        });
      });
  }

  async loadSvg(dashboardId: string): Promise<string> {
    return dashboardsApi.getDashboardSvg(dashboardId);
  }

  // Atomic create/replace of an SVG dashboard (metadata + svg.current) via PUT /api/dashboards/<id>.
  // currentId is the on-disk id being edited; dashboard carries the final id (may differ on rename).
  async saveSvgDashboard(currentId: string, dashboard: DashboardBase): Promise<DashboardSaveResult> {
    const result = await this._runWrite(() => dashboardsApi.putDashboard(currentId, dashboard));
    if (result === 'ok') {
      runInAction(() => {
        if (dashboard.id !== currentId) {
          this.dashboards.delete(currentId);
        }
        this.dashboards.set(dashboard.id, new Dashboard(dashboard));
      });
    }
    return result;
  }

  // Text-only dashboard creation: svg dashboards go through saveSvgDashboard.
  async addDashboard(data: DashboardBase): Promise<void> {
    this.dashboards.set(data.id, new Dashboard(data));

    await this._saveData();
  }

  // Text dashboard edit from the list modal. A rename goes through PATCH /api/dashboards/<oldId>
  // and updates the local map only after it succeeds (on 409/error the old id is kept); a
  // non-rename edit updates the map and persists via the list PUT.
  async updateDashboard(oldId: string, data: DashboardBase): Promise<void> {
    const existing = this.dashboards.get(oldId);
    // Defensive no-op. `dashboards` is a local in-memory map (not a backend read) and is never
    // reloaded mid-session, while the only caller edits an id taken from the rendered list — so a
    // missing entry can't occur in any real flow. Bail silently (no user message) rather than
    // resurrect a vanished dashboard on disk from partial form data.
    if (!existing) {
      return;
    }
    const merged: DashboardBase = { ...existing, ...data };

    if (oldId !== data.id) {
      const result = await this._runWrite(
        () => dashboardsApi.patchDashboard(oldId, { id: data.id, name: data.name }),
      );
      if (result === 'ok') {
        runInAction(() => {
          this.dashboards.delete(oldId);
          this.dashboards.set(data.id, new Dashboard(merged));
        });
      }
      return;
    }

    this.dashboards.set(oldId, new Dashboard(merged));
    await this._saveData();
  }

  async updateDashboards(data: Dashboard[]) {
    this.dashboards = new Map(data.map((dashboard) => [dashboard.id, new Dashboard(dashboard)]));
    this._saveData();
  }

  // Deletes one dashboard (svg or text) via DELETE /api/dashboards/<id>, then drops it locally.
  async deleteDashboard(id: string) {
    const result = await this._runWrite(() => dashboardsApi.deleteDashboard(id));
    if (result === 'ok') {
      runInAction(() => {
        this.dashboards.delete(id);
      });
    }
  }

  // Visibility toggle via PATCH /api/dashboards/<id> (no svg markup dragged). Local options are
  // updated only after the PATCH succeeds, so a failed write can't desync the switch.
  async setDashboardHidden(id: string, isHidden: boolean) {
    const result = await this._runWrite(() => dashboardsApi.patchDashboard(id, { options: { isHidden } }));
    if (result === 'ok') {
      runInAction(() => {
        const dashboard = this.dashboards.get(id);
        if (dashboard) {
          dashboard.options = { ...dashboard.options, isHidden };
        }
      });
    }
  }

  addWidgetToDashboard(dashboardId: string, widgetId: string) {
    runInAction(() => {
      const dashboard = this.dashboards.get(dashboardId);
      dashboard.widgets.push(widgetId);
      this.dashboards.set(dashboardId, new Dashboard(dashboard));
      this._saveData();
    });
  }

  removeWidgetFromDashboard(dashboardId: string, widgetId: string, withSave = true) {
    runInAction(() => {
      const dashboard = this.dashboards.get(dashboardId);
      dashboard.widgets = dashboard.widgets.filter((widget) => widget !== widgetId);
      this.dashboards.set(dashboardId, new Dashboard(dashboard));
      if (withSave) {
        this._saveData();
      }
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

  setDefaultDashboardId(id: string | null) {
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

  // --- Private ---
  // Runs a single-dashboard write (PUT/PATCH/DELETE) and maps the outcome to a DashboardSaveResult
  // ('ok' clears saveError, 'conflict' is HTTP 409 left untouched, 'error' sets saveError).
  private async _runWrite(fn: () => Promise<void>): Promise<DashboardSaveResult> {
    try {
      await fn();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        return 'conflict';
      }
      runInAction(() => this._setSaveError(err));
      return 'error';
    }
    runInAction(() => {
      this.saveError = null;
    });
    return 'ok';
  }

  async _saveData() {
    const content: DashboardsConfig = {
      defaultDashboardId: this.defaultDashboardId,
      dashboards: Array.from(this.dashboards.values()).map((dashboard) => {
        const copy: DashboardBase = { ...dashboard };
        if (copy.svg) {
          copy.svg = { ...copy.svg };
          delete copy.svg.current;
        }
        return copy;
      }),
      widgets: Array.from(this.widgets.values()),
      description: this.description,
      isShowWidgetsPage: this.isShowWidgetsPage,
    };

    await dashboardsApi.saveDashboards(content)
      .then(() => {
        runInAction(() => {
          this.saveError = null;
        });
      })
      .catch((err: any) => {
        runInAction(() => this._setSaveError(err));
      });
  }

  _setSaveError(err: any) {
    this.saveError = i18n.t('dashboards.errors.save', { err });
  }
}
