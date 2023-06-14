'use strict';

import { makeObservable, observable, action, set } from 'mobx';
import { FullscreenStore } from '../components/fullscreen/fullscreenStore';

class ViewSvgDashboardPageStore {
  constructor() {
    this.loading = true;
    this.dashboard = null;
    this.forceFullscreen = false;
    this.fullscreen = new FullscreenStore();
    this.channelValues = observable.object({});
    this.deviceData = null;
    this.editFn = null;

    makeObservable(this, {
      loading: observable,
      dashboard: observable,
      forceFullscreen: observable,
      editFn: observable,
      setLoading: action,
      setDashboard: action,
      setForceFullscreen: action,
      setDeviceData: action,
      setSingleChannelValue: action,
      setEditFn: action,
    });
  }

  setLoading(isLoading) {
    this.loading = isLoading;
  }

  setDashboard(dashboard) {
    this.dashboard = dashboard;
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

  setEditFn(editFn) {
    this.editFn = editFn;
  }
}

export default ViewSvgDashboardPageStore;
