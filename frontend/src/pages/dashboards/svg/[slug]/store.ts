import { observable, set, makeAutoObservable } from 'mobx';
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
  public channelValues: Record<string, any>;
  private _unsubscribeOnValue = () => {};
  private _devicesStore: DeviceStore | null = null;

  #moveToDashboardFn: MoveToDashboardFn | null = null;

  constructor() {
    this.channelValues = observable.object({});

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
    this.setLoading(false);
  }

  setDeviceData(cells: Map<string, Cell>, devicesStore: DeviceStore) {
    this.cells = cells;
    Array.from(cells).forEach(([channel, cell]) => {
      set(this.channelValues, channel, cell.value);
    });

    if (!this._devicesStore) {
      this._devicesStore = devicesStore;
      this._unsubscribeOnValue = devicesStore.subscribeOnCellValue((cellId, value) => {
        if (this.cells?.has(cellId)) {
          set(this.channelValues, cellId, value);
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
    this._unsubscribeOnValue();
    this._devicesStore = null;
  }
}
