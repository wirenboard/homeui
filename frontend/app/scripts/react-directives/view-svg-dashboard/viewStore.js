'use strict';

import { makeObservable, observable, action } from 'mobx';

class ViewSvgDashboardStore {
  constructor(channelValues, editFn, moveToDashboardFn, switchValueFn) {
    this.dashboard = null;
    this.forceFullscreen = false;
    this.channelValues = channelValues;
    this.editFn = editFn;
    this.switchValueFn = switchValueFn;
    this.moveToDashboardFn = moveToDashboardFn;

    makeObservable(this, {
      dashboard: observable,
      forceFullscreen: observable,
      setDashboard: action,
      setForceFullscreen: action,
    });
  }

  setDashboard(dashboard) {
    this.dashboard = dashboard;
  }

  setForceFullscreen(value) {
    this.forceFullscreen = value;
  }

  switchValue(channel, value) {
    this?.switchValueFn(channel, value);
  }

  editDashboard() {
    this?.editFn(this.dashboard.id);
  }

  moveToDashboard(dashboardId) {
    this?.moveToDashboardFn(dashboardId);
  }
}

export default ViewSvgDashboardStore;
