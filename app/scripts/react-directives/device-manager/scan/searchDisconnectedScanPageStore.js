'use strict';

import { makeObservable, observable, action, runInAction } from 'mobx';
import CommonScanStore, { SelectionPolicy } from './scanPageStore';

class SearchDisconnectedScanPageStore {
  constructor(deviceManagerProxy, deviceTypesStore) {
    this.commonScanStore = new CommonScanStore(deviceManagerProxy, deviceTypesStore);
    this.onCancel = undefined;
    this.onOk = undefined;
    this.active = false;
    this.portPath = undefined;
    this.deviceTypesStore = deviceTypesStore;

    makeObservable(this, { active: observable, select: action, stopScanning: action });
  }

  // Expected props structure
  // https://github.com/wirenboard/wb-device-manager/blob/main/README.md
  update(stringDataToRender) {
    // wb-device-manager could be stopped, so it will clear state topic and send empty string
    if (stringDataToRender == '') {
      this.commonScanStore.setDeviceManagerUnavailable();
      return;
    }

    let data = JSON.parse(stringDataToRender);
    if (!data.error && !this.commonScanStore.acceptUpdates) {
      return;
    }
    data.devices = data.devices.filter(
      device => device.bootloader_mode || this.signatures.includes(device.device_signature)
    );
    this.commonScanStore.update(data);
  }

  select(deviceType, portPath, configuredDevices, slaveId) {
    this.signatures = this.deviceTypesStore.getDeviceSignatures(deviceType);
    this.portPath = portPath;
    this.active = true;
    const slaveIdInt = parseInt(slaveId);
    let outOfOrderSlaveIds = [];
    if (!isNaN(slaveIdInt)) {
      outOfOrderSlaveIds.push(slaveIdInt);
    }
    this.commonScanStore.startScanning(
      SelectionPolicy.Single,
      configuredDevices,
      this.portPath,
      outOfOrderSlaveIds
    );
    return new Promise((resolve, reject) => {
      this.onOk = async () => {
        try {
          runInAction(() => {
            this.active = false;
          });
          resolve(this.commonScanStore.getSelectedDevices()[0]);
        } catch (e) {}
      };

      this.onCancel = () => {
        this.stopScanning();
        resolve(undefined);
      };
    });
  }

  get isScanning() {
    return this.commonScanStore.isScanning;
  }

  stopScanning() {
    this.commonScanStore.stopScanning();
    this.active = false;
  }
}

export default SearchDisconnectedScanPageStore;
