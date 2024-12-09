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
    stateTransitions,
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
      stateTransitions.toMobileContent,
      stateTransitions.toTabs,
      this.deviceTypesStore,
      rolesFactory,
      setupDeviceFn,
      fwUpdateProxy
    );
    this.newDevicesScanPageStore = new NewDevicesScanPageStore(
      deviceManagerProxy,
      this.deviceTypesStore,
      stateTransitions.onLeaveScan
    );
    this.searchDisconnectedScanPageStore = new SearchDisconnectedScanPageStore(
      deviceManagerProxy,
      this.deviceTypesStore,
      stateTransitions.onLeaveSearchDisconnectedDevice
    );
    this.stateTransitions = stateTransitions;
    this.inMobileMode = false;

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

  movedToDeviceProperties() {
    this.configEditorPageStore.tabs.mobileModeStore.movedToContentPanel();
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

  setEmbeddedSoftwareUpdateProgress(stringData) {
    this.configEditorPageStore.setEmbeddedSoftwareUpdateProgress(JSON.parse(stringData));
  }

  setDeviceDisconnected(topic, error) {
    this.configEditorPageStore.setDeviceDisconnected(topic, error);
  }

  addWbDevice() {
    this.stateTransitions.toScan();
    this.newDevicesScanPageStore.select(
      new ConfiguredDevices(this.configEditorPageStore.tabs.portTabs, this.deviceTypesStore)
    );
  }

  addScannedDevices(selectedDevices) {
    this.configEditorPageStore.addDevices(selectedDevices);
  }

  searchDisconnectedDevice() {
    const selectedDeviceTab = this.configEditorPageStore.tabs.selectedTab;
    const selectedPortTab = this.configEditorPageStore.tabs.selectedPortTab;
    this.stateTransitions.toScan();
    this.searchDisconnectedScanPageStore.select(
      selectedDeviceTab.deviceType,
      selectedPortTab.editedData.path,
      new ConfiguredDevices(this.configEditorPageStore.tabs.portTabs, this.deviceTypesStore),
      selectedDeviceTab.slaveId
    );
  }

  async restoreDisconnectedDevice(device) {
    const selectedDeviceTab = this.configEditorPageStore.tabs.selectedTab;
    const selectedPortTab = this.configEditorPageStore.tabs.selectedPortTab;
    try {
      if (device) {
        device.newAddress = selectedDeviceTab.slaveId;
        selectedDeviceTab.setLoading(true);
        await this.configEditorPageStore.restoreDevice(device, selectedPortTab);
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

  setMobileMode(value) {
    this.inMobileMode = value;
    this.configEditorPageStore.tabs.mobileModeStore.setMobileMode(value);
  }
}

export default DeviceManagerPageStore;
