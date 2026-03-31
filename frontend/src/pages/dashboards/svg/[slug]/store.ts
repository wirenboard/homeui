import { observable, makeAutoObservable, type ObservableMap } from 'mobx';
import { type Dashboard } from '@/stores/dashboards';
import type Cell from '@/stores/device/cell';
import type DeviceStore from '@/stores/device/device-store';
import { type MoveToDashboardFn } from './types';

export class SvgDashboardPageStore {
  public loading = true;
  public dashboards: Dashboard[] = [];
  public dashboardConfigs: Dashboard[] = [];
  public dashboardIndex = 0;
  public cells: Map<string, Cell> = null;
  public dashboardId: string = null;
  public channelValues: ObservableMap<string, any>;
  private _unsubscribeOnValue = () => {};
  private _devicesStore: DeviceStore | null = null;

  #moveToDashboardFn: MoveToDashboardFn | null = null;

  constructor() {
    this.channelValues = observable.map<string, any>();

    makeAutoObservable(this, {}, { autoBind: true });
  }

  setLoading(isLoading: boolean) {
    this.loading = isLoading;
  }

  getDashboard(dashboardId: string) {
    return this.dashboardConfigs.find((d) => d.isSvg && d.id === dashboardId) || null;
  }

  setDashboards(dashboards: Dashboard[]) {
    this.dashboardConfigs = dashboards;
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

    if (this.cells) {
      const usedChannels = this.getUsedChannels();
      Array.from(this.channelValues.keys())
        .filter((key) => !usedChannels.has(key))
        .forEach((key) => this.channelValues.delete(key));
      usedChannels.forEach((channel) => {
        if (!this.channelValues.has(channel)) {
          const cell = this.cells.get(channel);
          if (cell) {
            this.channelValues.set(channel, cell.value);
          }
        }
      });
    }

    this.setLoading(false);
  }

  setDeviceData(cells: Map<string, Cell>, devicesStore: DeviceStore) {
    this.cells = cells;

    if (!this._devicesStore) {
      const usedChannels = this.getUsedChannels();
      cells.forEach((cell, channel) => {
        if (usedChannels.has(channel)) {
          this.channelValues.set(channel, cell.value);
        }
      });
      this._devicesStore = devicesStore;
      this._unsubscribeOnValue = devicesStore.subscribeOnCellValue((cellId, value) => {
        if (this.channelValues.has(cellId)) {
          this.channelValues.set(cellId, value);
        }
      });
    }
  }

  switchValue(channel: string, value: any) {
    if (!this.cells) {
      return;
    }
    try {
      const cell = this.cells.get(channel);
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
    this._devicesStore = null;
  }
}
