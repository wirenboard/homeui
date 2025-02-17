'use strict';

import { action, makeAutoObservable, makeObservable, observable, reaction, computed } from 'mobx';
import i18n from '../../../i18n/react/config';
import CollapseButtonState from '../../components/buttons/collapseButtonState';

export const SelectionPolicy = {
  Single: 'Select only one item',
  Multiple: 'Multiple selection',
};

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

  scanStopped() {
    this.requiredState = ScanState.NotSpecified;
    this.actualState = ScanState.Stopped;
  }
}

class SingleDeviceStore {
  constructor(scannedDevice, gotByFastScan, names, deviceTypes, selectable) {
    this.scannedDevice = scannedDevice;
    this.deviceTypes = deviceTypes;
    this.selectable = selectable;
    this.selected = this.selectable && !this.isUnknownType;
    this.duplicateSlaveId = false;
    this.misconfiguredPort = false;
    this.duplicateMqttTopic = false;
    this.names = names;
    this.gotByFastScan = gotByFastScan;
    this.disposer = undefined;

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
    if (this.scannedDevice.title === "WBMIO") {
      return "PLC-W-ACS-MBRTU-EXT";
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
    this.selected = this.selectable && value;
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
    return !this.bootloaderMode && !this.deviceTypes.length;
  }

  get bootloaderMode() {
    return this.scannedDevice.bootloader_mode;
  }
}

class DevicesStore {
  constructor(deviceTypesStore) {
    this.newDevices = [];
    this.alreadyConfiguredDevices = [];
    this.configuredDevices = {};
    this.devicesByUuid = new Set();
    this.deviceTypesStore = deviceTypesStore;
    this.selectionPolicy = SelectionPolicy.Multiple;
    this.allowToSelectDevicesInBootloader = false;

    makeObservable(this, {
      newDevices: observable,
      alreadyConfiguredDevices: observable,
      setDevices: action,
    });
  }

  addConfiguredDevice(scannedDevice, configuredDevice, gotByFastScan) {
    const deviceStore = new SingleDeviceStore(
      scannedDevice,
      gotByFastScan,
      [this.deviceTypesStore.getName(configuredDevice.deviceType)],
      [configuredDevice.deviceType],
      false
    );
    this.alreadyConfiguredDevices.push(deviceStore);
    this.alreadyConfiguredDevices.sort((d1, d2) => {
      if (d1.port == d2.port) {
        return d1.address - d2.address;
      }
      return d1.port.localeCompare(d2.port);
    });
    this.devicesByUuid.add(scannedDevice.uuid);
  }

  addNewDevice(scannedDevice, gotByFastScan) {
    const deviceTypes = this.deviceTypesStore.findNotDeprecatedDeviceTypes(
      scannedDevice.device_signature,
      scannedDevice.fw?.version
    );

    const isSelectable = this.allowToSelectDevicesInBootloader || !scannedDevice.bootloader_mode;

    let deviceStore = new SingleDeviceStore(
      scannedDevice,
      gotByFastScan,
      deviceTypes.map(dt => this.deviceTypesStore.getName(dt)),
      deviceTypes,
      isSelectable
    );

    if (this.selectionPolicy === SelectionPolicy.Single) {
      const disposer = reaction(
        () => deviceStore.selected,
        () => this.checkSingleSelection(deviceStore)
      );
      deviceStore.disposer = disposer;
      deviceStore.setSelected(false);
    }
    this.newDevices.push(deviceStore);
    this.devicesByUuid.add(scannedDevice.uuid);
  }

  addDevice(scannedDevice, gotByFastScan) {
    if (this.devicesByUuid.has(scannedDevice.uuid)) {
      return;
    }

    const configuredDevice = this.configuredDevices.findMatch(scannedDevice);
    if (configuredDevice) {
      this.addConfiguredDevice(scannedDevice, configuredDevice, gotByFastScan);
    } else {
      this.addNewDevice(scannedDevice, gotByFastScan);
    }
  }

  setDevices(scannedDevicesList, gotByFastScan) {
    if (!Array.isArray(scannedDevicesList)) {
      return;
    }
    scannedDevicesList.forEach(device => this.addDevice(device, gotByFastScan));
  }

  init(selectionPolicy, configuredDevices, allowToSelectDevicesInBootloader) {
    this.configuredDevices = configuredDevices;
    this.allowToSelectDevicesInBootloader = !!allowToSelectDevicesInBootloader;
    this.newDevices.forEach(device => device.disposer?.());
    this.selectionPolicy = selectionPolicy ?? SelectionPolicy.Multiple;
    this.newDevices = [];
    this.alreadyConfiguredDevices = [];
    this.devicesByUuid.clear();
  }

  checkSingleSelection(selectedDevice) {
    if (!selectedDevice.selected) {
      return;
    }
    this.newDevices.forEach(device => {
      if (device != selectedDevice && device.selected) {
        device.setSelected(false);
      }
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

class CommonScanStore {
  constructor(deviceManagerProxy, deviceTypesStore) {
    this.deviceManagerProxy = deviceManagerProxy;
    this.mqttStore = new MqttStateStore();
    this.scanStore = new ScanningProgressStore();
    this.devicesStore = new DevicesStore(deviceTypesStore);
    this.globalError = new GlobalErrorStore();
    this.acceptUpdates = false;
    this.portPath = null;
    this.outOfOrderSlaveIds = null;
    this.alreadyConfiguredDevicesCollapseButtonState = new CollapseButtonState(true);

    makeObservable(this, { hasSelectedItems: computed });
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
    this.scanStore.scanStopped();
    if ('MqttTimeoutError'.localeCompare(err.data) == 0) {
      this.setDeviceManagerUnavailable();
    } else {
      this.globalError.setError(err.message);
    }
  }

  async startScanningCommon(type) {
    this.scanStore.startScan();
    const preserve_old_results = type != 'extended';
    if (!preserve_old_results) {
      this.globalError.clearError();
    }
    try {
      if (await this.deviceManagerProxy.hasMethod('Start')) {
        let params = {
          scan_type: type,
          preserve_old_results: preserve_old_results,
        };
        if (this.portPath) {
          params.port = { path: this.portPath };
        }
        if (this.outOfOrderSlaveIds) {
          params.out_of_order_slave_ids = this.outOfOrderSlaveIds;
        }
        await this.deviceManagerProxy.Start(params);
        this.acceptUpdates = true;
      } else {
        this.setDeviceManagerUnavailable();
      }
    } catch (err) {
      this.setScanFailed(err);
    }
  }

  async startExtendedScanning() {
    await this.startScanningCommon('extended');
  }

  async startStandardScanning() {
    await this.startScanningCommon('standard');
  }

  async startBootloaderScanning() {
    await this.startScanningCommon('bootloader');
  }

  stopScanning() {
    this.scanStore.scanStopped();
    this.acceptUpdates = false;
    this.deviceManagerProxy.Stop();
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

  /**
   * Starts the scanning process.
   *
   * @param {SelectionPolicy} selectionPolicy - The selection policy for scanning.
   * @param {Array} configuredDevices - The list of configured devices.
   * @param {string} portPath - The path of the port.
   * @param {Array} outOfOrderSlaveIds - The list of out-of-order slave IDs.
   * @param {boolean} allowToSelectDevicesInBootloader - The flag to allow to select devices in bootloader.
   * @returns {void}
   */
  startScanning(
    selectionPolicy,
    configuredDevices,
    portPath,
    outOfOrderSlaveIds,
    allowToSelectDevicesInBootloader
  ) {
    this.devicesStore.init(selectionPolicy, configuredDevices, allowToSelectDevicesInBootloader);
    this.portPath = portPath;
    this.outOfOrderSlaveIds = outOfOrderSlaveIds;
    this.startExtendedScanning();
  }

  getSelectedDevices() {
    return this.devicesStore.newDevices
      .filter(d => d.selected)
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
          bootloaderMode: d.bootloaderMode,
        };
      });
  }

  get hasSelectedItems() {
    return (
      this.devicesStore.newDevices.some(d => d.selected) &&
      this.scanStore.actualState !== ScanState.Started
    );
  }

  get isScanning() {
    return (
      this.scanStore.requiredState == ScanState.Started ||
      this.scanStore.actualState == ScanState.Started
    );
  }
}

export default CommonScanStore;
