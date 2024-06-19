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
  constructor(scannedDevice, names, deviceTypes) {
    this.scannedDevice = scannedDevice;
    this.deviceTypes = deviceTypes;
    this.selected = !this.isUnknownType;
    this.duplicateSlaveId = false;
    this.misconfiguredPort = false;
    this.duplicateMqttTopic = false;
    this.names = names;

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

function isCompletelySameDevice(scannedDevice, configuredDevice) {
  return (
    configuredDevice.slave_id == scannedDevice.cfg.slave_id &&
    configuredDevice.signatures.includes(scannedDevice.device_signature) &&
    configuredDevice.sn == scannedDevice.sn
  );
}

function isPotentiallySameDevice(scannedDevice, configuredDevice) {
  return (
    configuredDevice.slave_id == scannedDevice.cfg.slave_id &&
    configuredDevice.signatures.includes(scannedDevice.device_signature) &&
    !configuredDevice.sn
  );
}

class DevicesStore {
  constructor(deviceTypesStore) {
    this.devices = [];
    this.configuredDevices = {};
    this.devicesByUuid = new Set();
    this.topics = new Set();
    this.deviceTypesStore = deviceTypesStore;

    makeObservable(this, { devices: observable, setDevices: action });
  }

  addDevice(scannedDevice) {
    if (this.devicesByUuid.has(scannedDevice.uuid)) {
      return;
    }

    const configuredDevicesWithSameAddress = this.configuredDevices[
      scannedDevice.port.path
    ]?.devices?.filter(d => d.slave_id == scannedDevice.cfg.slave_id);

    if (configuredDevicesWithSameAddress?.some(d => isCompletelySameDevice(scannedDevice, d))) {
      return;
    }

    // Config has devices without SN. They are configured but never polled, maybe found device is one of them
    const maybeSameDevices = configuredDevicesWithSameAddress?.filter(d =>
      isPotentiallySameDevice(scannedDevice, d)
    );
    if (maybeSameDevices.find(d => d.uuidFoundByScan == scannedDevice.uuid)) {
      return;
    }
    const maybeSameDevice = maybeSameDevices.find(d => !d.uuidFoundByScan);
    if (maybeSameDevice) {
      maybeSameDevice.uuidFoundByScan = scannedDevice.uuid;
      return;
    }

    const deviceTypes = this.deviceTypesStore.findDeviceTypes(
      scannedDevice.device_signature,
      scannedDevice.fw?.version
    );

    let d = new SingleDeviceStore(
      scannedDevice,
      deviceTypes.map(dt => this.deviceTypesStore.getName(dt)),
      deviceTypes
    );
    if (
      configuredDevicesWithSameAddress?.length ||
      this.devices.some(foundDevice => foundDevice.address == scannedDevice.slave_id)
    ) {
      d.setDuplicateSlaveId();
    }

    const configuredDevice = this.configuredDevices[scannedDevice.port.path];
    if (
      configuredDevice &&
      (scannedDevice.cfg.baud_rate != configuredDevice.cfg.baud_rate ||
        scannedDevice.cfg.data_bits != configuredDevice.cfg.data_bits ||
        scannedDevice.cfg.parity != configuredDevice.cfg.parity ||
        scannedDevice.cfg.stop_bits != configuredDevice.cfg.stop_bits)
    ) {
      d.setMisconfiguredPort();
    }

    if (!d.isUnknownType) {
      const topic = this.deviceTypesStore.getDefaultId(d.deviceType, scannedDevice.cfg.slave_id);
      if (this.topics.has(topic)) {
        d.setDuplicateMqttTopic();
      } else {
        this.topics.add(topic);
      }
    }

    this.devicesByUuid.add(scannedDevice.uuid);
    this.devices.push(d);
  }

  setDevices(scannedDevicesList) {
    if (!Array.isArray(scannedDevicesList)) {
      return;
    }
    scannedDevicesList.forEach(device => this.addDevice(device));
  }

  init(configuredDevices) {
    this.devices = [];
    this.configuredDevices = configuredDevices;
    this.devicesByUuid.clear();
    this.topics.clear();
    Object.values(configuredDevices).forEach(port => {
      port.devices.forEach(device => {
        this.topics.add(device.topic);
      });
    });
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

class ScanPageStore {
  constructor(
    startScanFn,
    stopScanFn,
    cancelFn,
    addDevicesFn,
    deviceTypesStore,
    updateSerialConfigFn
  ) {
    this.startScanFn = startScanFn;
    this.stopScanFn = stopScanFn;
    this.mqttStore = new MqttStateStore();
    this.scanStore = new ScanningProgressStore();
    this.devicesStore = new DevicesStore(deviceTypesStore);
    this.globalError = new GlobalErrorStore();
    this.cancelFn = cancelFn;
    this.addDevicesFn = addDevicesFn;
    this.acceptUpdates = false;
    this.updateSerialConfigFn = updateSerialConfigFn;

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

  startExtendedScanning(configuredDevices) {
    this.devicesStore.init(configuredDevices);
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
  update(dataToRender) {
    // wb-device-manager could be stopped, so it will clear state topic and send empty string
    if (dataToRender == '') {
      this.setDeviceManagerUnavailable();
    } else {
      const data = JSON.parse(dataToRender);
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
      this.devicesStore.setDevices(data.devices);
      this.mqttStore.setStartupComplete();
      if (this.scanStore.actualState == ScanState.Stopped) {
        this.acceptUpdates = false;
      }
    }
  }

  updateSerialConfig() {
    this.updateSerialConfigFn(
      this.devicesStore.devices
        .filter(d => d.selected && !d.scannedDevice.bootloader_mode)
        .map(d => {
          return {
            port: d.scannedDevice.port.path,
            cfg: d.scannedDevice.cfg,
            type: d.deviceType,
          };
        })
    );
  }
}

export default ScanPageStore;
