'use strict';

import { makeObservable, computed } from 'mobx';
import NewDevicesScanPageStore from './scan/newDevicesScanPageStore';
import ConfigEditorPageStore from './config-editor/configEditorPageStore';
import DeviceTypesStore from './common/deviceTypesStore';
import SearchDisconnectedScanPageStore from './scan/searchDisconnectedScanPageStore';
import ConfiguredDevices from './config-editor/configuredDevices';

class DeviceManagerPageStore {
  constructor(
    loadConfigFn,
    saveConfigFn,
    toMobileContent,
    toTabs,
    loadDeviceTypeFn,
    rolesFactory,
    deviceManagerProxy,
    fwUpdateProxy,
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
      setupDeviceFn,
      fwUpdateProxy
    );
    this.newDevicesScanPageStore = new NewDevicesScanPageStore(
      deviceManagerProxy,
      this.deviceTypesStore
    );
    this.searchDisconnectedScanPageStore = new SearchDisconnectedScanPageStore(
      deviceManagerProxy,
      this.deviceTypesStore
    );

    makeObservable(this, {
      isDirty: computed,
    });
  }

  get isDirty() {
    return this.configEditorPageStore.isDirty;
  }

  movedToTabsPanel() {
    this.configEditorPageStore.tabs.mobileModeStore.movedToTabsPanel();
  }

  async loadConfig() {
    await this.configEditorPageStore.load();
  }

  updateScanState(data) {
    if (this.newDevicesScanPageStore.active) {
      this.newDevicesScanPageStore.update(data);
      return;
    }
    if (this.searchDisconnectedScanPageStore.active) {
      this.searchDisconnectedScanPageStore.update(data);
      return;
    }
  }

  updateFirmwareUpdateState(stringData) {
    this.configEditorPageStore.updateFirmwareUpdateState(JSON.parse(stringData));
  }

  setDeviceDisconnected(topic, error) {
    this.configEditorPageStore.setDeviceDisconnected(topic, error);
  }

  async addWbDevice() {
    await this.configEditorPageStore.addDevices(
      await this.newDevicesScanPageStore.select(
        new ConfiguredDevices(this.configEditorPageStore.tabs.portTabs, this.deviceTypesStore)
      )
    );
  }

  async searchDisconnectedDevice() {
    const selectedDeviceTab = this.configEditorPageStore.tabs.selectedTab;
    const selectedPortTab = this.configEditorPageStore.tabs.selectedPortTab;
    try {
      const device = await this.searchDisconnectedScanPageStore.select(
        selectedDeviceTab.deviceType,
        selectedPortTab.editedData.path,
        new ConfiguredDevices(this.configEditorPageStore.tabs.portTabs, this.deviceTypesStore)
      );
      if (device) {
        device.newAddress = selectedDeviceTab.slaveId;
        selectedDeviceTab.setLoading(true);
        await this.configEditorPageStore.setupDevice(device);
        selectedDeviceTab.setDisconnected(false);
      }
    } catch (err) {
      this.configEditorPageStore.setError(err);
    }
    selectedDeviceTab.setLoading(false);
  }

  shouldConfirmLeavePage() {
    return (
      this.newDevicesScanPageStore.isScanning || this.searchDisconnectedScanPageStore.isScanning
    );
  }

  stopScanning() {
    this.newDevicesScanPageStore.stopScanning();
    this.searchDisconnectedScanPageStore.stopScanning();
  }
}

export default DeviceManagerPageStore;
