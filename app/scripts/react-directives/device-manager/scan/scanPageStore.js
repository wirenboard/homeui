'use strict';

import { action, makeAutoObservable, makeObservable, observable } from 'mobx';
import i18n from '../../../i18n/react/config';

class GlobalErrorStore {
  error = '';

  constructor() {
    makeAutoObservable(this);
  }

  // Error can be a string or object
  // {
  //    "id": "com.wb.device_manager.generic_error"
  //    "message": "Internal error. Check logs for more info"
  //    "metadata": {...}
  // }
  // where "id" - unique id of error,
  //       "message" - human readable message for the error,
  //       "metadata" - object with specific error parameters
  setError(error) {
    if (typeof error === 'string') {
      this.error = error;
      return;
    }

    if (typeof error !== 'object') {
      return;
    }

    if (!error.hasOwnProperty('id')) {
      this.error = error.message;
      return;
    }

    if (
      error.id === 'com.wb.device_manager.failed_to_scan_error' &&
      error.metadata &&
      error.metadata.failed_ports
    ) {
      this.error = i18n.t(error.id, {
        defaultValue: error.message,
        replace: {
          failed_ports: error.metadata.failed_ports.join(', '),
        },
        interpolation: { escapeValue: false },
      });
      return;
    }
    this.error = i18n.t(error.id, error.message);
  }

  clearError() {
    this.setError('');
  }
}

export const ScanState = {
  Started: 'Started',
  Stopped: 'Stopped',
  NotSpecified: 'NotSpecified',
};

class ScanningProgressStore {
  actualState = ScanState.NotSpecified;
  requiredState = ScanState.NotSpecified;
  progress = 0;
  scanningPorts = [];
  isExtendedScanning = false;

  constructor() {
    makeAutoObservable(this);
  }

  setStateFromMqtt(isScanning, scanProgress, scanningPorts, isExtendedScanning) {
    this.actualState = isScanning ? ScanState.Started : ScanState.Stopped;
    this.progress = scanProgress;
    this.scanningPorts = scanningPorts;
    this.isExtendedScanning = isExtendedScanning;

    if (this.actualState == this.requiredState) {
      this.requiredState = ScanState.NotSpecified;
    }
  }

  startScan() {
    this.requiredState = ScanState.Started;
    if (this.actualState == ScanState.Started) {
      return;
    }
    this.progress = 0;
  }

  stopScan() {
    this.requiredState = ScanState.Stopped;
  }

  scanFailed() {
    this.requiredState = ScanState.NotSpecified;
    this.actualState = ScanState.Stopped;
  }
}

class SingleDeviceStore {
  constructor(scannedDevice, gotByFastScan, names, deviceTypes) {
    this.scannedDevice = scannedDevice;
    this.deviceTypes = deviceTypes;
    this.selected = !this.isUnknownType;
    this.duplicateSlaveId = false;
    this.misconfiguredPort = false;
    this.duplicateMqttTopic = false;
    this.names = names;
    this.gotByFastScan = gotByFastScan;

    makeObservable(this, {
      scannedDevice: observable.ref,
      selected: observable,
      setSelected: action.bound,
      update: action,
    });
  }

  get title() {
    if (this.names.length) {
      return this.names[0];
    }
    return this.scannedDevice.title;
  }

  get address() {
    return this.scannedDevice.cfg.slave_id;
  }

  get port() {
    return this.scannedDevice.port.path;
  }

  get sn() {
    return this.scannedDevice.sn;
  }

  get baudRate() {
    return this.scannedDevice.cfg.baud_rate;
  }

  get dataBits() {
    return this.scannedDevice.cfg.data_bits;
  }

  get parity() {
    return this.scannedDevice.cfg.parity;
  }

  get stopBits() {
    return this.scannedDevice.cfg.stop_bits;
  }

  get uuid() {
    return this.scannedDevice.uuid;
  }

  get deviceType() {
    if (this.deviceTypes.length) {
      return this.deviceTypes[0];
    }
    return undefined;
  }

  setSelected(value) {
    this.selected = value;
  }

  update(scannedDevice) {
    this.scannedDevice = scannedDevice;
  }

  setDuplicateSlaveId() {
    this.duplicateSlaveId = true;
  }

  setMisconfiguredPort() {
    this.misconfiguredPort = true;
  }

  setDuplicateMqttTopic() {
    this.duplicateMqttTopic = true;
  }

  get isUnknownType() {
    return !this.deviceTypes.length;
  }
}

class DevicesStore {
  constructor(deviceTypesStore) {
    this.devices = [];
    this.devicesByUuid = new Set();
    this.deviceTypesStore = deviceTypesStore;

    makeObservable(this, { devices: observable, setDevices: action });
  }

  addDevice(scannedDevice, gotByFastScan) {
    if (this.devicesByUuid.has(scannedDevice.uuid)) {
      return;
    }

    const deviceTypes = this.deviceTypesStore.findDeviceTypes(
      scannedDevice.device_signature,
      scannedDevice.fw?.version
    );

    let deviceStore = new SingleDeviceStore(
      scannedDevice,
      gotByFastScan,
      deviceTypes.map(dt => this.deviceTypesStore.getName(dt)),
      deviceTypes
    );

    this.devicesByUuid.add(scannedDevice.uuid);
    this.devices.push(deviceStore);
  }

  setDevices(scannedDevicesList, gotByFastScan) {
    if (!Array.isArray(scannedDevicesList)) {
      return;
    }
    scannedDevicesList.forEach(device => this.addDevice(device, gotByFastScan));
  }

  init(deviceFilter) {
    this.devices = [];
    this.devicesByUuid.clear();
  }
}

class MqttStateStore {
  waitStartup = true;
  deviceManagerIsAvailable = false;

  constructor() {
    makeAutoObservable(this);
  }

  setDeviceManagerUnavailable() {
    this.setStartupComplete();
    this.deviceManagerIsAvailable = false;
  }

  setDeviceManagerAvailable() {
    this.deviceManagerIsAvailable = true;
  }

  setStartupComplete() {
    this.waitStartup = false;
  }
}

class CommonScanStore {
  constructor(startScanFn, stopScanFn, deviceTypesStore) {
    this.startScanFn = startScanFn;
    this.stopScanFn = stopScanFn;
    this.mqttStore = new MqttStateStore();
    this.scanStore = new ScanningProgressStore();
    this.devicesStore = new DevicesStore(deviceTypesStore);
    this.globalError = new GlobalErrorStore();
    this.acceptUpdates = false;

    makeAutoObservable(this);
  }

  setDeviceManagerUnavailable() {
    this.acceptUpdates = false;
    this.mqttStore.setDeviceManagerUnavailable();
    this.globalError.setError(i18n.t('scan.errors.unavailable'));
  }

  setDeviceManagerAvailable() {
    this.mqttStore.setDeviceManagerAvailable();
  }

  setScanFailed(err) {
    this.acceptUpdates = false;
    this.scanStore.scanFailed();
    if ('MqttTimeoutError'.localeCompare(err.data) == 0) {
      this.setDeviceManagerUnavailable();
    } else {
      this.globalError.setError(err.message);
    }
  }

  startExtendedScanning() {
    this.scanStore.startScan();
    this.globalError.clearError();
    this.startScanFn(true)
      .then(() => (this.acceptUpdates = true))
      .catch(err => this.setScanFailed(err));
  }

  startStandardScanning() {
    this.scanStore.startScan();
    this.globalError.clearError();
    this.startScanFn(false)
      .then(() => (this.acceptUpdates = true))
      .catch(err => this.setScanFailed(err));
  }

  stopScanning() {
    this.scanStore.stopScan();
    this.stopScanFn()
      .then(() => (this.acceptUpdates = false))
      .catch(err => this.setScanFailed(err));
  }

  // Expected props structure
  // https://github.com/wirenboard/wb-device-manager/blob/main/README.md
  update(data) {
    if (data.error) {
      this.globalError.setError(data.error);
    }
    if (!this.acceptUpdates) {
      return;
    }
    this.scanStore.setStateFromMqtt(
      data.scanning,
      data.progress,
      data.scanning_ports,
      data.is_ext_scan
    );
    this.devicesStore.setDevices(data.devices, data.is_ext_scan);
    this.mqttStore.setStartupComplete();
    if (this.scanStore.actualState == ScanState.Stopped) {
      this.acceptUpdates = false;
    }
  }

  startScanning() {
    this.devicesStore.init();
    this.startExtendedScanning();
  }

  getSelectedDevices() {
    return this.devicesStore.devices
      .filter(d => d.selected && !d.scannedDevice.bootloader_mode)
      .map(d => {
        return {
          title: d.title,
          port: d.port,
          sn: d.sn,
          address: d.scannedDevice.cfg.slave_id,
          baudRate: d.scannedDevice.cfg.baud_rate,
          parity: d.scannedDevice.cfg.parity,
          stopBits: d.scannedDevice.cfg.stop_bits,
          type: d.deviceType,
          gotByFastScan: d.gotByFastScan,
        };
      });
  }

  get hasSelectedItems() {
    return (
      this.devicesStore.devices.some(d => d.selected) &&
      this.scanStore.actualState !== ScanState.Started
    );
  }
}

export default CommonScanStore;
