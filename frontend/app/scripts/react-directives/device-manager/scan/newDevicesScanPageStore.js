'use strict';

import { makeObservable, observable, action } from 'mobx';
import CommonScanStore, { SelectionPolicy } from './scanPageStore';
import SetupAddressModalState from './setupAddressModalState';
import ModbusAddressSet from '../common/modbusAddressesSet';

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
 * It should accept an array of selected devices.
 *
 * @callback LeaveCallback
 * @param {SelectedDevice[]} devices
 */

class NewDevicesScanPageStore {
  configuredDevices;
  active;
  commonScanStore;
  setupAddressModalState;
  onLeave;

  /**
   * Constructs a new instance of the NewDevicesScanPageStore.
   * @param {DeviceManagerProxy} deviceManagerProxy - The device manager proxy.
   * @param {DeviceTypesStore} deviceTypesStore - The device types store.
   * @param {LeaveCallback} onLeave - The function to call when leaving the page.
   */
  constructor(deviceManagerProxy, deviceTypesStore, onLeave) {
    this.commonScanStore = new CommonScanStore(deviceManagerProxy, deviceTypesStore);
    this.active = false;
    this.setupAddressModalState = new SetupAddressModalState();
    this.onLeave = onLeave;

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

    const data = JSON.parse(stringDataToRender);
    if (!data.error && !this.commonScanStore.acceptUpdates) {
      return;
    }

    this.commonScanStore.update(data);
  }

  /**
   * Starts scanning for new devices
   * and activates page with a list of found devices to select
   */
  select(configuredDevices) {
    this.configuredDevices = configuredDevices;
    this.active = true;
    this.commonScanStore.startScanning(SelectionPolicy.Multiple, configuredDevices);
  }

  async onOk() {
    try {
      const devices = await this.confirmAddressChange();
      this.stopScanning();
      this?.onLeave(devices);
    } catch (e) {}
  }

  onCancel() {
    this.stopScanning();
    this?.onLeave([]);
  }

  async confirmAddressChange() {
    let modbusAddressesSet = new ModbusAddressSet(this.configuredDevices.getUsedAddresses());
    const devices = this.commonScanStore.getSelectedDevices();
    const devicesWithDuplicateAddresses = devices.filter(
      device => !modbusAddressesSet.tryToAddUsedAddress(device.port, device.address)
    );
    const devicesToModify = [];
    devicesWithDuplicateAddresses.forEach(scannedDevice => {
      const newAddress = modbusAddressesSet.fixAddress(scannedDevice.port, scannedDevice.address);
      if (newAddress != scannedDevice.address) {
        scannedDevice.newAddress = newAddress;
        devicesToModify.push(scannedDevice);
      }
    });

    if (!devicesToModify.length) {
      return devices;
    }

    if (await this.setupAddressModalState.show(devicesToModify)) {
      return devices;
    }
    throw new Error('Address change canceled');
  }

  get isScanning() {
    return this.commonScanStore.isScanning;
  }

  stopScanning() {
    if (this.isScanning) {
      this.commonScanStore.stopScanning();
    }
    this.active = false;
  }
}

export default NewDevicesScanPageStore;
