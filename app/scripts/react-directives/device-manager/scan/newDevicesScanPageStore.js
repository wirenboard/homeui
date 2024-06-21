'use strict';

import { makeObservable, observable, action, runInAction } from 'mobx';
import CommonScanStore from './scanPageStore';
import SetupAddressModalState from './setupAddressModalState';
import ModbusAddressSet from '../common/modbusAddressesSet';

function isCompletelySameDevice(scannedDevice, configuredDevice) {
  return (
    configuredDevice.address == scannedDevice.cfg.slave_id &&
    configuredDevice.signatures.includes(scannedDevice.device_signature) &&
    configuredDevice.sn == scannedDevice.sn
  );
}

function isPotentiallySameDevice(scannedDevice, configuredDevice) {
  return (
    configuredDevice.address == scannedDevice.cfg.slave_id &&
    configuredDevice.signatures.includes(scannedDevice.device_signature) &&
    !configuredDevice.sn
  );
}

function getConfiguredDeviceByAddress(configuredDevices, scannedDevice) {
  if (!configuredDevices.hasOwnProperty(scannedDevice.port.path)) {
    return [];
  }
  return configuredDevices[scannedDevice.port.path].filter(
    d => d.address == scannedDevice.cfg.slave_id
  );
}

class NewDevicesScanPageStore {
  constructor(startScanFn, stopScanFn, deviceTypesStore) {
    this.commonScanStore = new CommonScanStore(startScanFn, stopScanFn, deviceTypesStore);
    this.onCancel = undefined;
    this.onOk = undefined;
    this.active = false;
    this.configuredDevices = [];
    this.setupAddressModalState = new SetupAddressModalState();

    makeObservable(this, { active: observable, select: action });
  }

  setDeviceManagerUnavailable() {
    this.commonScanStore.setDeviceManagerUnavailable();
  }

  setDeviceManagerAvailable() {
    this.commonScanStore.setDeviceManagerAvailable();
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
    if (data.error) {
      this.commonScanStore.update(data);
      return;
    }

    if (!this.commonScanStore.acceptUpdates) {
      return;
    }

    data.devices = data.devices.filter(device => this.filter(device));

    this.commonScanStore.update(data);
  }

  /**
   * Selects configured devices and starts scanning for new devices.
   *
   * @typedef {Object} ConfiguredDevice
   * @property {number} address
   * @property {string} sn
   * @property {string} deviceType
   * @property {Array} signatures
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
   * @param {Object.<string, ConfiguredDevice[]>}  configuredDevices - Configured devices grouped by port path
   * @returns {Promise<SelectedDevice[]>} - A promise that resolves with the list of devices after confirmation or an empty array if canceled
   */
  select(configuredDevices) {
    this.configuredDevices = configuredDevices;
    this.active = true;
    this.commonScanStore.startScanning();
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
        this.commonScanStore.stopScanning();
        runInAction(() => {
          this.active = false;
        });
        resolve([]);
      };
    });
  }

  filter(scannedDevice) {
    const configuredDevicesWithSameAddress = getConfiguredDeviceByAddress(
      this.configuredDevices,
      scannedDevice
    );

    if (configuredDevicesWithSameAddress.some(d => isCompletelySameDevice(scannedDevice, d))) {
      return false;
    }

    // Config has devices without SN. They are configured but never polled, maybe found device is one of them
    const maybeSameDevices = configuredDevicesWithSameAddress.filter(d =>
      isPotentiallySameDevice(scannedDevice, d)
    );

    if (maybeSameDevices.find(d => d.uuidFoundByScan == scannedDevice.uuid)) {
      return false;
    }
    const maybeSameDevice = maybeSameDevices.find(d => !d.uuidFoundByScan);
    if (maybeSameDevice) {
      maybeSameDevice.uuidFoundByScan = scannedDevice.uuid;
      return false;
    }

    return true;
  }

  async confirmAddressChange() {
    let modbusAddressesSet = new ModbusAddressSet(this.configuredDevices);
    const devices = this.commonScanStore.getSelectedDevices();
    const devicesToModify = [];
    devices.forEach(scannedDevice => {
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
}

export default NewDevicesScanPageStore;
