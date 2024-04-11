'use strict';

import { makeObservable, observable, computed, action, runInAction } from 'mobx';
import ScanPageStore from './scan/scanPageStore';
import ConfigEditorPageStore from './config-editor/configEditorPageStore';
import DeviceTypesStore from './common/deviceTypesStore';

class DeviceManagerPageStore {
  constructor(
    loadConfigFn,
    saveConfigFn,
    toMobileContent,
    toTabs,
    loadDeviceTypeFn,
    rolesFactory,
    startScanFn,
    stopScanFn
  ) {
    this.deviceTypesStore = new DeviceTypesStore(loadDeviceTypeFn);
    this.configEditorPageStore = new ConfigEditorPageStore(
      loadConfigFn,
      saveConfigFn,
      toMobileContent,
      toTabs,
      this.deviceTypesStore,
      rolesFactory
    );
    this.scanPageStore = new ScanPageStore(
      startScanFn,
      stopScanFn,
      () => this.cancelAddingDevices(),
      () => {},
      this.deviceTypesStore,
      devices => this.addDevices(devices)
    );
    this.showScan = false;

    makeObservable(this, {
      showScan: observable,
      isDirty: computed,
      addWbDevice: action,
      cancelAddingDevices: action,
      addDevices: action,
    });
  }

  get isDirty() {
    return this.configEditorPageStore.isDirty;
  }

  movedToTabsPanel() {
    this.tabs.mobileModeStore.movedToTabsPanel();
  }

  loadConfig() {
    this.configEditorPageStore.load();
  }

  setDeviceManagerAvailable() {
    this.scanPageStore.setDeviceManagerAvailable();
  }

  setDeviceManagerUnavailable() {
    this.scanPageStore.setDeviceManagerUnavailable();
  }

  updateScanState(data) {
    this.scanPageStore.update(data);
  }

  makeConfiguredDevicesList(portTabChildren) {
    return portTabChildren.reduce((acc, deviceTab) => {
      const deviceType = deviceTab.editedData.device_type;
      if (this.deviceTypesStore.isModbusDevice(deviceType)) {
        acc.push({
          slave_id: deviceTab.editedData.slave_id,
          sn: deviceTab.editedData.sn,
          device_type: deviceType,
          signatures: this.deviceTypesStore.getDeviceSignatures(deviceType),
          topic:
            deviceTab.editedData.id ||
            this.deviceTypesStore.getDefaultId(deviceType, deviceTab.editedData.slave_id),
        });
      }
      if (deviceTab.editedData.protocol == 'modbus') {
        acc.push({
          slave_id: deviceTab.editedData.slave_id,
          sn: deviceTab.editedData.sn,
          device_type: undefined,
          signatures: [],
          topic: `modbus_${deviceTab.editedData.slave_id}`,
        });
      }
      return acc;
    }, []);
  }

  addWbDevice() {
    const configuredModbusDevices = this.configEditorPageStore.tabs.portTabs.reduce(
      (acc, portTab) => {
        if (portTab.editedData.port_type != 'serial') {
          return acc;
        }
        acc[portTab.editedData.path] = {
          cfg: {
            baud_rate: portTab.editedData.baud_rate,
            data_bits: portTab.editedData.data_bits,
            parity: portTab.editedData.parity,
            stop_bits: portTab.editedData.stop_bits,
          },
          devices: this.makeConfiguredDevicesList(portTab.children),
        };
        return acc;
      },
      {}
    );
    this.scanPageStore.startExtendedScanning(configuredModbusDevices);
    this.showScan = true;
  }

  cancelAddingDevices() {
    this.showScan = false;
    this.scanPageStore.stopScanning();
  }

  async addDevices(devices) {
    runInAction(() => {
      this.showScan = false;
    });
    await this.configEditorPageStore.addDevices(devices);
  }
}

export default DeviceManagerPageStore;
