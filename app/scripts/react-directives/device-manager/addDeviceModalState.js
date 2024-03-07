'use strict';

import { makeAutoObservable } from 'mobx';

class AddDeviceModalState {
  active = false;
  ports = [];
  devices = [];
  onSelect = undefined;
  onCancel = undefined;
  currentPort = undefined;

  constructor() {
    makeAutoObservable(this);
  }

  show(portOptions, deviceOptions, currentPort) {
    this.ports = portOptions;
    this.devices = deviceOptions;
    this.currentPort = portOptions.find(option => option.value === currentPort);
    return new Promise((resolve, reject) => {
      this.onSelect = (port, deviceType) => {
        this.active = false;
        resolve([port, deviceType]);
      };
      this.onCancel = () => {
        this.active = false;
        reject('cancel');
      };
      this.active = true;
    });
  }
}

export default AddDeviceModalState;
