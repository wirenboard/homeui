'use strict';

import { makeAutoObservable } from 'mobx';
import i18n from '../../i18n/react/config';

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
    var msg = '';
    if (typeof error === 'string') {
      msg = error;
    } else if (typeof error === 'object') {
      if (error.hasOwnProperty('id')) {
        if (
          error.id === 'com.wb.device_manager.failed_to_scan_error' &&
          error.metadata &&
          error.metadata.failed_ports
        ) {
          msg = i18n.t(error.id, {
            defaultValue: error.message,
            replace: {
              failed_ports: error.metadata.failed_ports.join(', '),
            },
            interpolation: { escapeValue: false },
          });
        } else {
          msg = i18n.t(error.id, error.message);
        }
      } else {
        msg = error.message;
      }
    }
    this.error = msg;
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
  firstStart = true;
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
    if (isScanning) {
      this.firstStart = false;
    }
  }

  startScan() {
    this.requiredState = ScanState.Started;
    this.firstStart = false;
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

class DevicesStore {
  devices = [];

  constructor() {
    makeAutoObservable(this);
  }

  setDevices(devicesList) {
    if (Array.isArray(devicesList)) {
      this.devices = devicesList;
    }
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

class DeviceManagerStore {
  constructor(DeviceManagerProxy, updateSerialConfigFn) {
    this.DeviceManagerProxy = DeviceManagerProxy;
    this.mqttStore = new MqttStateStore();
    this.scanStore = new ScanningProgressStore();
    this.devicesStore = new DevicesStore();
    this.globalError = new GlobalErrorStore();
    this.updateSerialConfigFn = updateSerialConfigFn;

    makeAutoObservable(this);
  }

  setDeviceManagerUnavailable() {
    this.mqttStore.setDeviceManagerUnavailable();
    scope.globalError.setError(i18n.t('device-manager.errors.unavailable'));
  }

  setScanFailed(err) {
    this.scanStore.scanFailed();
    if ('MqttTimeoutError'.localeCompare(err.data) == 0) {
      this.setDeviceManagerUnavailable();
    } else {
      this.globalError.setError(err.message);
    }
  }

  startScanning() {
    this.scanStore.startScan();
    this.devicesStore.setDevices([]);
    this.globalError.clearError();
    this.DeviceManagerProxy.Start().catch(err => this.setScanFailed(err));
  }

  stopScanning() {
    this.scanStore.stopScan();
    this.DeviceManagerProxy.Stop().catch(err => this.setScanFailed(err));
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
      this.scanStore.setStateFromMqtt(
        data.scanning,
        data.progress,
        data.scanning_ports,
        data.is_ext_scan
      );
      this.devicesStore.setDevices(data.devices);
      this.mqttStore.setStartupComplete();
    }
  }

  updateSerialConfig() {
    this.updateSerialConfigFn(
      this.devicesStore.devices.map(d => {
        return {
          title: d.title,
          device_signature: d.device_signature,
          port: d.port.path,
          slave_id: d.cfg.slave_id,
          fw: d.fw.version,
        };
      })
    );
  }
}

export default DeviceManagerStore;
