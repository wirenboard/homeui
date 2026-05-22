import { makeAutoObservable } from 'mobx';
import { type DeviceTabStore } from '@/stores/device-manager';
import { MobileModeTabsStore } from './mobile-mode-tabs-store';
import { type PortTab } from './port-tab-store';
import { type SettingsTab } from './settings-tab-store';
import { UniqueMqttIdChecker } from './unique-mqtt-id-checker';

function getMqttIdFromTopic(topic: string) {
  const components = topic.split('/');
  return components?.[2];
}

export enum TabType {
  Port = 'port',
  Device = 'device',
  Settings = 'settings',
}

export class TabsStore {
  public items: (SettingsTab | PortTab | DeviceTabStore)[] = [];
  public selectedTabIndex = 0;
  // Has added, deleted items or items with changed type
  public hasModifiedStructure = false;
  public mobileModeStore: MobileModeTabsStore;
  public uniqueMqttIdChecker: UniqueMqttIdChecker;

  constructor(toMobileContent: () => void, toTabs: () => void) {
    this.mobileModeStore = new MobileModeTabsStore(toMobileContent, toTabs);
    this.uniqueMqttIdChecker = new UniqueMqttIdChecker();

    makeAutoObservable(this);
  }

  addPortTab(tab: PortTab, initial?: boolean) {
    let i = this.items.length;
    if (i > 0 && this.items[i - 1].type === TabType.Settings) {
      i--;
    }
    this.items.splice(i, 0, tab);
    if (!initial) {
      this.selectedTabIndex = i;
      this.hasModifiedStructure = true;
      if (this.mobileModeStore.inMobileMode) {
        this.mobileModeStore.showContentPanel();
      }
    }
    tab.children.forEach((child) => {
      i++;
      this.items.splice(i, 0, child);
      this.uniqueMqttIdChecker.addTab(tab, child);
    });
  }

  addDeviceTab(portTab: PortTab, deviceTab: DeviceTabStore, selectTab: boolean) {
    let portTabIndex = this.items.indexOf(portTab);
    if (portTabIndex === -1) {
      return;
    }
    portTab.addChildren(deviceTab);
    portTab.restore();
    this.uniqueMqttIdChecker.addTab(portTab, deviceTab);
    let i = portTabIndex + 1;
    while (i < this.items.length && this.items[i]?.type === TabType.Device) {
      i++;
    }
    this.items.splice(i, 0, deviceTab);
    this.hasModifiedStructure = true;
    if (selectTab) {
      this.onSelectTab(i);
    }
  }

  addSettingsTab(tab: SettingsTab) {
    this.items.push(tab);
  }

  onSelectTab(index: number) {
    this.selectedTabIndex = index;
    if (this.mobileModeStore.inMobileMode) {
      this.mobileModeStore.showContentPanel();
    }
    const tab = this.items[index];
    if (tab.type === TabType.Device) {
      const portTab = this.selectedPortTab;
      (tab as DeviceTabStore).loadContent(portTab.baseConfig);
    }
    return true;
  }

  selectTab(tab: SettingsTab | PortTab | DeviceTabStore) {
    const index = this.items.indexOf(tab);
    if (index !== -1) {
      this.onSelectTab(index);
    }
  }

  deleteTab(tab: SettingsTab | PortTab | DeviceTabStore) {
    const index = this.items.indexOf(tab);
    if (index === -1) {
      return;
    }
    switch (tab?.type) {
      case TabType.Port: {
        this.deletePortDevices(tab as PortTab);
        this.items.splice(index, 1);
        break;
      }
      case TabType.Device: {
        let portTab = this.selectedPortTab;
        const childIndex = portTab.children.indexOf(tab as DeviceTabStore);
        portTab.deleteChildren(childIndex);
        this.items.splice(index, 1);
        this.uniqueMqttIdChecker.removeTab(tab as DeviceTabStore);
        break;
      }
      default: {
        return;
      }
    }
    this.hasModifiedStructure = true;
  }

  deleteSelectedTab() {
    const tab = this.items[this.selectedTabIndex];
    let newSelectedTabIndex = this.selectedTabIndex;
    if (tab?.type === TabType.Device) {
      let portTab = this.selectedPortTab;
      const childIndex = portTab.children.indexOf(tab as DeviceTabStore);
      if (
        (childIndex === 0 && portTab.children.length === 1) ||
      (childIndex !== 0 && childIndex + 1 === portTab.children.length)
      ) {
        newSelectedTabIndex = this.selectedTabIndex - 1;
      }
    }
    this.deleteTab(tab);
    this.mobileModeStore.showTabsPanel();
    this.onSelectTab(newSelectedTabIndex);
  }

  get selectedPortTab(): PortTab | undefined {
    let i = this.selectedTabIndex;
    while (i >= 0 && this.items[i]?.type !== TabType.Port) {
      i--;
    }
    if (i >= this.items.length) {
      return undefined;
    }
    return this.items[i] as PortTab;
  }

  get selectedTab(): PortTab | DeviceTabStore | SettingsTab {
    return this.items?.[this.selectedTabIndex];
  }

  get portTabs() {
    return this.items.filter((item) => item.type === TabType.Port) as PortTab[];
  }

  get hasInvalidConfig() {
    return this.items.some((item) => item.hasInvalidConfig);
  }

  get isDirty() {
    return this.hasModifiedStructure || this.items.some((item) => item.isDirty);
  }

  get isEmpty() {
    return this.items.length === 0;
  }

  get hasPortTabs() {
    return this.items.some((item) => item.type === TabType.Port);
  }

  commitData() {
    this.items.forEach((item) => item.commitData());
    this.hasModifiedStructure = false;
  }

  clear() {
    this.items.splice(0, this.items.length);
    this.hasModifiedStructure = false;
  }

  setModifiedStructure() {
    this.hasModifiedStructure = true;
  }

  findDeviceTabByTopic(topic: string) {
    const mqttId = getMqttIdFromTopic(topic);
    return this.items.find((item) => {
      if (item.type === TabType.Device) {
        return (item as DeviceTabStore).mqttId === mqttId;
      }
      return false;
    }) as DeviceTabStore;
  }

  findPortTabByPath(portPath: string, protocol: string) {
    const isModbusTcp = protocol === 'modbus-tcp';
    return this.items.find((item) => {
      if (item.type === TabType.Port) {
        return (item as PortTab).path === portPath && (item as PortTab).isModbusTcp === isModbusTcp;
      }
      return false;
    }) as PortTab;
  }

  findPortTabByDevice(deviceTab: DeviceTabStore) {
    return this.items.find((item) => {
      if (item.type === TabType.Port) {
        return (item as PortTab).children.includes(deviceTab);
      }
      return false;
    }) as PortTab;
  }

  deletePortDevices(portTab: PortTab) {
    const deviceTabsCount = portTab.children.length;
    if (!deviceTabsCount) {
      return;
    }
    let portTabIndex = this.selectedTabIndex;
    if (this.items.at(portTabIndex) !== portTab) {
      portTabIndex = this.items.findIndex((item) => item === portTab);
    }
    if (portTabIndex === -1) {
      return;
    }
    for (let i = 0; i < deviceTabsCount; i++) {
      const deviceTab = portTab.children[0];
      portTab.deleteChildren(0);
      this.uniqueMqttIdChecker.removeTab(deviceTab);
    }
    this.items.splice(portTabIndex + 1, deviceTabsCount);
    this.hasModifiedStructure = true;
  }
}
