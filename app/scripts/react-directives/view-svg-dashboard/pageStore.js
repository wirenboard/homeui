'use strict';

import { makeObservable, observable, action, set } from 'mobx';
import { FullscreenStore } from '../components/fullscreen/fullscreenStore';
import ViewSvgDashboardStore from './viewStore';

class ViewSvgDashboardPageStore {
  constructor() {
    this.loading = true;
    this.fullscreen = new FullscreenStore();
    this.forceFullscreen = false;
    this.channelValues = observable.object({});
    this.deviceData = null;
    this.editFn = null;
    this.moveToDashboardFn = null;
    this.originalDashboardId = null;
    this.switchValueFn = null;
    this.key = Math.random();
    this.dashboardIndex = 0;

    this.dashboards = [];

    this.dashboardConfigs = {};

    makeObservable(this, {
      key: observable,
      dashboardIndex: observable,
      dashboards: observable,
      loading: observable,
      forceFullscreen: observable,
      setDashboard: action,
      setLoading: action,
      setDeviceData: action,
      setSingleChannelValue: action,
      slideChanged: action,
    });
  }

  setLoading(isLoading) {
    this.loading = isLoading;
  }

  getDashboard(dashboardId) {
    const dashboard = this.dashboardConfigs.find(d => d.id == dashboardId);
    if (!dashboard) {
      return null;
    }
    let store = new ViewSvgDashboardStore(
      this.channelValues,
      id => this?.editFn(id),
      id => this.moveToDashboard(id),
      (channel, value) => {
        let cell = this.deviceData.cell(channel);
        cell.value = cell.value == value.on ? value.off : value.on;
      },
      (channel, value) => this.switchValue(channel, value)
    );
    store.setForceFullscreen(this.forceFullscreen);
    store.setDashboard(dashboard);

    return store;
  }

  setDashboards(dashboards) {
    this.dashboardConfigs = dashboards;
  }

  setDashboard(dashboardId) {
    this.dashboards = [];
    this.originalDashboardId = dashboardId;
    this.dashboardIndex = 0;
    const dashboard = this.getDashboard(dashboardId);
    if (dashboard?.dashboard?.swipe?.enable) {
      const leftDashboard = this.getDashboard(dashboard.dashboard.swipe.right);
      if (leftDashboard) {
        this.dashboards.push(leftDashboard);
        this.dashboardIndex = 1;
      }
    }
    this.dashboards.push(dashboard);
    if (dashboard?.dashboard?.swipe?.enable) {
      const rightDashboard = this.getDashboard(dashboard.dashboard.swipe.left);
      if (rightDashboard) {
        this.dashboards.push(rightDashboard);
      }
    }
    this.key = Math.random();
    this.setLoading(false);
  }

  setForceFullscreen(value) {
    this.forceFullscreen = value;
  }

  setDeviceData(deviceData) {
    this.deviceData = deviceData;
    Object.entries(deviceData.cells).forEach(([channel, cell]) => {
      set(this.channelValues, channel, cell.value);
    });
    deviceData.onValue((channel, value) => {
      this.setSingleChannelValue(channel, value);
    });
  }

  setSingleChannelValue(channel, value) {
    set(this.channelValues, channel, value);
  }

  switchValue(channel, value) {
    let cell = this.deviceData.cell(channel);
    cell.value = cell.value == value.on ? value.off : value.on;
  }

  editDashboard() {
    this?.editFn();
  }

  moveToDashboard(dashboardId) {
    this?.moveToDashboardFn(dashboardId);
  }

  setEditDashboardFn(editFn) {
    this.editFn = editFn;
  }

  setMoveToDashboardFn(moveToDashboardFn) {
    this.moveToDashboardFn = moveToDashboardFn;
  }

  setSwitchValueFn(switchValueFn) {
    this.switchValueFn = switchValueFn;
  }

  switchValue(channel, value) {
    this?.switchValueFn(channel, value);
  }

  moveToDashboard(dashboardId) {
    if (this.originalDashboardId == dashboardId) {
      this.setDashboard(dashboardId);
    } else {
      this.moveToDashboardFn(dashboardId);
    }
  }

  slideChanged(index) {
    if (this.dashboardIndex != index) {
      this.moveToDashboard(this.dashboards[index].dashboard.id);
      this.setDashboard(this.dashboards[index].dashboard.id);
    }
  }
}

export default ViewSvgDashboardPageStore;
