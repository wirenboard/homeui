'use strict';

import { makeObservable, observable, action } from 'mobx';
import CommonScanStore, { SelectionPolicy } from './scanPageStore';

/**
 * @typedef {Object} SelectedDevice
 * @property {string} title
 * @property {string} sn
 * @property {number} address
 * @property {string} type
 * @property {string} port
 * @property {string} baudRate
 * @property {string} parity
 * @property {string} stopBits
 * @property {boolean} gotByFastScan
 */

/**
 * The function to call when leaving the page.
 * It should accept a selected device or undefined.
 *
 * @callback LeaveCallback
 * @param {SelectedDevice|undefined} device
 */

class SearchDisconnectedScanPageStore {
  /**
   * Constructs a new instance of the SearchDisconnectedScanPageStore.
   * @param {DeviceManagerProxy} deviceManagerProxy - The device manager proxy.
   * @param {DeviceTypesStore} deviceTypesStore - The device types store.
   * @param {LeaveCallback} onLeave - The callback function to be called when leaving the page.
   */
  constructor(deviceManagerProxy, deviceTypesStore, onLeave) {
    this.commonScanStore = new CommonScanStore(deviceManagerProxy, deviceTypesStore);
    this.active = false;
    this.portPath = undefined;
    this.deviceTypesStore = deviceTypesStore;
    this.onLeave = onLeave;

    makeObservable(this, {
      active: observable,
      select: action,
      stopScanning: action,
      onOk: action,
    });
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
      outOfOrderSlaveIds,
      true
    );
  }

  onOk() {
    this.active = false;
    this?.onLeave(this.commonScanStore.getSelectedDevices()[0]);
  }

  onCancel() {
    this.stopScanning();
    this?.onLeave(undefined);
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
