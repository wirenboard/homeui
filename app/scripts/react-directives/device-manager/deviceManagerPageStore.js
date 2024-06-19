'use strict';

import { makeObservable, computed, action } from 'mobx';
import NewDevicesScanPageStore from './scan/newDevicesScanPageStore';
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
    stopScanFn,
    setupDeviceFn
  ) {
    this.deviceTypesStore = new DeviceTypesStore(loadDeviceTypeFn);
    this.configEditorPageStore = new ConfigEditorPageStore(
      loadConfigFn,
      saveConfigFn,
      toMobileContent,
      toTabs,
      this.deviceTypesStore,
      rolesFactory,
      setupDeviceFn
    );
    this.newDevicesScanPageStore = new NewDevicesScanPageStore(
      startScanFn,
      stopScanFn,
      this.deviceTypesStore
    );
    this.startScanFn = startScanFn;

    makeObservable(this, {
      isDirty: computed,
      addWbDevice: action,
    });
  }

  get isDirty() {
    return this.configEditorPageStore.isDirty;
  }

  movedToTabsPanel() {
    this.tabs.mobileModeStore.movedToTabsPanel();
  }

  async loadConfig() {
    await this.configEditorPageStore.load();
  }

  setDeviceManagerAvailable() {
    this.newDevicesScanPageStore.setDeviceManagerAvailable();
  }

  setDeviceManagerUnavailable() {
    this.newDevicesScanPageStore.setDeviceManagerUnavailable();
  }

  updateScanState(data) {
    if (this.newDevicesScanPageStore.active) {
      this.newDevicesScanPageStore.update(data);
      return;
    }
  }

  setDeviceDisconnected(topic, error) {
    this.configEditorPageStore.setDeviceDisconnected(topic, error);
  }

  makeConfiguredDevicesList(portTabChildren) {
    return portTabChildren.reduce((acc, deviceTab) => {
      const deviceType = deviceTab.editedData.device_type;
      if (this.deviceTypesStore.isModbusDevice(deviceType)) {
        acc.push({
          address: deviceTab.editedData.slave_id,
          sn: deviceTab.editedData.sn,
          deviceType: deviceType,
          signatures: this.deviceTypesStore.getDeviceSignatures(deviceType),
        });
      }
      if (deviceTab.editedData.protocol == 'modbus') {
        acc.push({
          address: deviceTab.editedData.slave_id,
          sn: deviceTab.editedData.sn,
          deviceType: undefined,
          signatures: [],
        });
      }
      return acc;
    }, []);
  }

  async addWbDevice() {
    const configuredModbusDevices = this.configEditorPageStore.tabs.portTabs.reduce(
      (acc, portTab) => {
        if (portTab.editedData.port_type == 'serial') {
          acc[portTab.editedData.path] = this.makeConfiguredDevicesList(portTab.children);
        }
        return acc;
      },
      {}
    );
    await this.configEditorPageStore.addDevices(
      await this.newDevicesScanPageStore.select(configuredModbusDevices)
    );
  }
}

export default DeviceManagerPageStore;
