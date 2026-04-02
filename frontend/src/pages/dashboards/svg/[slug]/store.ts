import { observable, makeAutoObservable, type ObservableMap, reaction, runInAction } from 'mobx';
import type { Dashboard, DashboardsStore } from '@/stores/dashboards';
import type DevicesStore from '@/stores/device/device-store';
import { type MoveToDashboardFn } from './types';

export class SvgDashboardPageStore {
  public loading = true;
  public dashboards: Dashboard[] = [];
  public dashboardIndex = 0;
  public dashboardId: string = null;
  public channelValues: ObservableMap<string, any>;
  private _unsubscribeOnValue = () => {};

  private _frame: number | null = null;
  private _pendingUpdates = new Map<string, any>();

  #moveToDashboardFn: MoveToDashboardFn | null = null;
  #dashboardsStore: DashboardsStore;
  #devicesStore: DevicesStore;

  constructor(dashboardsStore: DashboardsStore, devicesStore: DevicesStore) {
    this.channelValues = observable.map<string, any>();
    this.#dashboardsStore = dashboardsStore;
    this.#devicesStore = devicesStore;

    makeAutoObservable(this, {}, { autoBind: true });

    reaction(
      () => [this.getUsedChannels(), this.dashboardId],
      () => {
        if (this.#devicesStore.cells.size) {
          this.setDeviceData();
        }
      }
    );
  }

  setLoading(isLoading: boolean) {
    this.loading = isLoading;
  }

  getDashboard(dashboardId: string) {
    return this.dashboardConfigs.find((d) => d.isSvg && d.id === dashboardId) || null;
  }

  get dashboardConfigs(): Dashboard[] {
    return this.#dashboardsStore.dashboardsList;
  }

  private getUsedChannels(): Set<string> {
    const channels = new Set<string>();
    this.dashboards[this.dashboardIndex]?.svg?.params?.forEach((param) => {
      Object.values(param).forEach((p: any) => {
        if (p?.enable && p?.channel) {
          channels.add(p.channel);
        }
      });
    });
    return channels;
  }

  setDashboard(dashboardId: string) {
    const dashboard = this.getDashboard(dashboardId);
    if (!dashboard) {
      return;
    }
    this.dashboards = [];
    this.dashboardId = dashboardId;
    this.dashboardIndex = 0;
    if (dashboard?.swipe?.enable) {
      const leftDashboard = this.getDashboard(dashboard.swipe.right);
      if (leftDashboard) {
        this.dashboards.push(leftDashboard);
        this.dashboardIndex = 1;
      }
    }
    this.dashboards.push(dashboard);
    if (dashboard?.swipe?.enable) {
      const rightDashboard = this.getDashboard(dashboard.swipe.left);
      if (rightDashboard) {
        this.dashboards.push(rightDashboard);
      }
    }

    if (this.#devicesStore.cells) {
      const usedChannels = this.getUsedChannels();
      Array.from(this.channelValues.keys())
        .filter((key) => !usedChannels.has(key))
        .forEach((key) => this.channelValues.delete(key));
      usedChannels.forEach((channel) => {
        if (!this.channelValues.has(channel)) {
          const cell = this.#devicesStore.cells.get(channel);
          this.channelValues.set(channel, cell ? cell.value : '');
        }
      });
    }

    this.setLoading(false);
  }

  setDeviceData() {
    this._unsubscribeOnValue();

    const usedChannels = this.getUsedChannels();
    this.#devicesStore.cells.forEach((cell, channel) => {
      if (usedChannels.has(channel)) {
        this.channelValues.set(channel, cell.value);
      }
    });
    this._unsubscribeOnValue = this.#devicesStore.subscribeOnCellValue((cellId, value) => {
      if (!this.channelValues.has(cellId)) return;

      this._pendingUpdates.set(cellId, value);

      if (this._frame) return;

      this._frame = requestAnimationFrame(() => {
        if (this._frame) {
          cancelAnimationFrame(this._frame);
          this._frame = null;
        }

        runInAction(() => {
          this._pendingUpdates.forEach((val, id) => {
            if (this.channelValues.get(id) !== val) {
              this.channelValues.set(id, val);
            }
          });
        });

        this._pendingUpdates.clear();
      });
    });
  }

  switchValue(channel: string, value: any) {
    if (!this.#devicesStore.cells) {
      return;
    }
    try {
      const cell = this.#devicesStore.cells.get(channel);
      cell.value = cell.getStringifiedValue() === String(value.on) ? value.off : value.on;
    } catch (e) {
      // Do nothing if cell is not found
    }
  }

  setMoveToDashboardFn(moveToDashboardFn: MoveToDashboardFn) {
    this.#moveToDashboardFn = moveToDashboardFn;
  }

  moveToDashboard(dashboardId: string) {
    if (this.dashboardId !== dashboardId) {
      setTimeout(() => {
        this.#moveToDashboardFn(dashboardId, this.dashboardId);
        this.setDashboard(dashboardId);
      });
    }
  }

  unsubscribeAll() {
    this.channelValues.clear();
    this._unsubscribeOnValue();
    this._unsubscribeOnValue = () => {};
  }
}
