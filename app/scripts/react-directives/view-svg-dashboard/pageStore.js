'use strict';

import { makeObservable, observable, action, set } from 'mobx';
import { FullscreenStore } from '../components/fullscreen/fullscreenStore';
import ViewSvgDashboardStore from './viewStore';
import AccessLevelStore from '../components/access-level/accessLevelStore';

class ViewSvgDashboardPageStore {
  constructor(rolesFactory) {
    this.loading = true;
    this.fullscreen = new FullscreenStore();
    this.forceFullscreen = false;
    this.channelValues = observable.object({});
    this.deviceData = null;
    this.editFn = null;
    this.moveToDashboardFn = null;
    this.dashboardId = null;
    this.key = Math.random();
    this.dashboardIndex = 0;
    this.editAccessLevelStore = new AccessLevelStore(rolesFactory);
    this.editAccessLevelStore.setRole(rolesFactory.ROLE_TWO);

    this.dashboards = [];

    this.dashboardConfigs = {};

    makeObservable(this, {
      key: observable,
      dashboardIndex: observable,
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
    const dashboard = this.dashboardConfigs.find(d => d.isSvg && d.id == dashboardId);
    if (!dashboard) {
      return null;
    }
    let store = new ViewSvgDashboardStore(
      this.channelValues,
      id => this?.editFn(id),
      id => this.moveToDashboard(id),
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
    const dashboard = this.getDashboard(dashboardId);
    if (!dashboard) {
      return;
    }
    this.dashboards = [];
    this.dashboardId = dashboardId;
    this.dashboardIndex = 0;
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
    if (!this.deviceData) {
      return;
    }
    try {
      let cell = this.deviceData.cell(channel);
      cell.value = cell.value == value.on ? value.off : value.on;
    } catch (e) {
      // Do nothing if cell is not found
    }
  }

  editDashboard() {
    this?.editFn();
  }

  setEditDashboardFn(editFn) {
    this.editFn = editFn;
  }

  setMoveToDashboardFn(moveToDashboardFn) {
    this.moveToDashboardFn = moveToDashboardFn;
  }

  moveToDashboard(dashboardId) {
    if (this.dashboardId != dashboardId) {
      this.setLoading(true);
      setTimeout(() => {
        this.moveToDashboardFn(dashboardId, this.dashboardId);
        this.setDashboard(dashboardId);
      });
    }
  }

  slideChanged(index) {
    const dashboardId = this.dashboards[index].dashboard.id;
    if (this.dashboardId != dashboardId) {
      setTimeout(() => {
        this.moveToDashboardFn(dashboardId);
      });
    }
    this.setDashboard(dashboardId);
  }
}

export default ViewSvgDashboardPageStore;
