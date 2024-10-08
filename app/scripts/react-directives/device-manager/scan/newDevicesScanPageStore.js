'use strict';

import { makeObservable, observable, action, runInAction } from 'mobx';
import CommonScanStore, { SelectionPolicy } from './scanPageStore';
import SetupAddressModalState from './setupAddressModalState';
import ModbusAddressSet from '../common/modbusAddressesSet';

class NewDevicesScanPageStore {
  configuredDevices;
  onCancel;
  onOk;
  active;
  commonScanStore;
  setupAddressModalState;

  constructor(deviceManagerProxy, deviceTypesStore) {
    this.commonScanStore = new CommonScanStore(deviceManagerProxy, deviceTypesStore);
    this.active = false;
    this.setupAddressModalState = new SetupAddressModalState();

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
   *
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
   *
   * @returns {Promise<SelectedDevice[]>} - A promise that resolves with the list of devices after confirmation or an empty array if canceled
   */
  select(configuredDevices) {
    this.configuredDevices = configuredDevices;
    this.active = true;
    this.commonScanStore.startScanning(SelectionPolicy.Multiple, configuredDevices);
    return new Promise((resolve, reject) => {
      this.onOk = async () => {
        try {
          const devices = await this.confirmAddressChange();
          runInAction(() => {
            this.active = false;
          });
          resolve(devices);
        } catch (e) {}
      };

      this.onCancel = () => {
        this.stopScanning();
        resolve([]);
      };
    });
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
    this.commonScanStore.stopScanning();
    this.active = false;
  }
}

export default NewDevicesScanPageStore;
