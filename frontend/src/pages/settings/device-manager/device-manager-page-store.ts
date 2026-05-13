import { makeObservable, computed } from 'mobx';
import { NewDevicesScanPageStore, SearchDisconnectedScanPageStore } from '@/pages/settings/device-manager/scan';
import { type DeviceTabStore, DeviceTypesStore } from '@/stores/device-manager';
import type { PortTabConfig } from '@/stores/device-manager/port-tab/types';
import type {
  DeviceManagerProxyProxy,
  FwUpdateProxy,
  ScannedDevice,
  SerialDeviceProxy,
  SerialPortProxy,
} from '@/stores/device-manager/types';
import { ConfigEditorPageStore } from './config-editor/stores/config-editor-page-store';
import { ConfiguredDevices } from './config-editor/stores/configured-devices';
import type { ConfigJson, LoadConfigResult } from './config-editor/stores/types';
import { type StateTransitions } from './types';

export class DeviceManagerPageStore {
  public deviceTypesStore: DeviceTypesStore;
  public configEditorPageStore: ConfigEditorPageStore;
  public newDevicesScanPageStore: NewDevicesScanPageStore;
  public searchDisconnectedScanPageStore: SearchDisconnectedScanPageStore;
  public inMobileMode: boolean = false;
  public stateTransitions: StateTransitions;

  constructor(
    loadConfigFn: () => Promise<LoadConfigResult>,
    saveConfigFn: (_cfg: ConfigJson) => Promise<void>,
    stateTransitions: StateTransitions,
    loadDeviceTypeFn: (_deviceType: string) => Promise<void>,
    deviceManagerProxy: DeviceManagerProxyProxy,
    fwUpdateProxy: FwUpdateProxy,
    serialDeviceProxy: SerialDeviceProxy,
    seralPortProxy: SerialPortProxy,
  ) {
    this.deviceTypesStore = new DeviceTypesStore(loadDeviceTypeFn);
    this.configEditorPageStore = new ConfigEditorPageStore(
      loadConfigFn,
      saveConfigFn,
      stateTransitions.toMobileContent,
      stateTransitions.toTabs,
      this.deviceTypesStore,
      fwUpdateProxy,
      serialDeviceProxy,
      seralPortProxy,
    );
    this.newDevicesScanPageStore = new NewDevicesScanPageStore(
      deviceManagerProxy,
      this.deviceTypesStore,
      stateTransitions.onLeaveScan,
    );
    this.searchDisconnectedScanPageStore = new SearchDisconnectedScanPageStore(
      deviceManagerProxy,
      this.deviceTypesStore,
      stateTransitions.onLeaveSearchDisconnectedDevice,
    );
    this.stateTransitions = stateTransitions;

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

  updateScanState(data: string) {
    if (this.newDevicesScanPageStore.active) {
      this.newDevicesScanPageStore.update(data);
      return;
    }
    if (this.searchDisconnectedScanPageStore.active) {
      this.searchDisconnectedScanPageStore.update(data);
      return;
    }
  }

  setEmbeddedSoftwareUpdateProgress(stringData: string) {
    // wb-device-manager could be stopped, so it will clear state topic and send empty string
    if (stringData === '') {
      return;
    }
    this.configEditorPageStore.setEmbeddedSoftwareUpdateProgress(JSON.parse(stringData));
  }

  setDeviceDisconnected(topic: string, error: string) {
    this.configEditorPageStore.setDeviceDisconnected(topic, error);
  }

  addWbDevice() {
    this.stateTransitions.toScan();
    this.newDevicesScanPageStore.select(
      new ConfiguredDevices(this.configEditorPageStore.tabs.portTabs, this.deviceTypesStore),
    );
  }

  addScannedDevices(selectedDevices: ScannedDevice[]) {
    this.configEditorPageStore.addDevices(selectedDevices);
  }

  searchDisconnectedDevice() {
    const selectedDeviceTab = this.configEditorPageStore.tabs.selectedTab as DeviceTabStore;
    const selectedPortTab = this.configEditorPageStore.tabs.selectedPortTab;
    this.stateTransitions.toScan();
    this.searchDisconnectedScanPageStore.select(
      selectedDeviceTab.deviceType,
      selectedPortTab.path,
      selectedPortTab.isModbusTcp,
      new ConfiguredDevices(this.configEditorPageStore.tabs.portTabs, this.deviceTypesStore),
      selectedDeviceTab.slaveId,
    );
  }

  async restoreDisconnectedDevice(device?: Partial<ScannedDevice>) {
    if (device) {
      const selectedTab = this.configEditorPageStore.tabs.selectedTab as DeviceTabStore;
      const selectedPortTab = this.configEditorPageStore.tabs.selectedPortTab;
      selectedTab.restoreDisconnectedDevice(device as ScannedDevice, selectedPortTab.baseConfig as PortTabConfig);
    }
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

  setMobileMode(value: boolean) {
    this.inMobileMode = value;
    this.configEditorPageStore.tabs.mobileModeStore.setMobileMode(value);
  }
}
