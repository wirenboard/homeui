import { type IReactionDisposer, reaction } from 'mobx';
import { type DeviceTabStore } from '@/stores/device-manager';
import { type PortTab } from './port-tab-store';

export class UniqueMqttIdChecker {
  public tabToId: Map<DeviceTabStore, string>;
  public idToTab: Record<string, { tab: DeviceTabStore; port: PortTab; disposer: IReactionDisposer }[]> = {};

  constructor() {
    this.tabToId = new Map();
  }

  updateState(deviceTabsWithSameId: { tab: DeviceTabStore; port: PortTab; disposer: IReactionDisposer }[]) {
    deviceTabsWithSameId.forEach((tabItem, _index, arr) => {
      let others = [];
      if (tabItem.tab.slaveId !== undefined) {
        others = arr.filter((tab) => tab !== tabItem);
      }
      tabItem.tab.setDevicesWithTheSameId(others.map((d) => `${d.tab.name} (${d.port.name})`));
    });
  }

  addTab(portTab: PortTab, deviceTab: DeviceTabStore) {
    const disposer = reaction(
      () => {
        return deviceTab.editedData;
      },
      () => {
        this.updateTab(deviceTab);
      },
    );
    const id = deviceTab.mqttId as string;
    this.idToTab[id] ??= [];
    this.idToTab[id].push({ tab: deviceTab, port: portTab, disposer: disposer });
    this.tabToId.set(deviceTab, id);
    this.updateState(this.idToTab[id]);
  }

  extractTabItem(id: string, deviceTab: DeviceTabStore) {
    let deviceTabs = this.idToTab[id] || [];
    let tabIndex = deviceTabs.findIndex((tab) => tab.tab === deviceTab);
    if (tabIndex === -1) {
      return;
    }
    const tabItem = deviceTabs[tabIndex];
    deviceTabs.splice(tabIndex, 1);
    this.idToTab[id] = deviceTabs;
    this.tabToId.delete(deviceTab);
    this.updateState(deviceTabs);
    return tabItem;
  }

  removeTab(deviceTab: DeviceTabStore) {
    this.extractTabItem(deviceTab.mqttId, deviceTab).disposer();
  }

  updateTab(deviceTab: DeviceTabStore) {
    const id = this.tabToId.get(deviceTab);
    if (id === undefined || id === deviceTab.mqttId) {
      return;
    }

    const tabItem = this.extractTabItem(id, deviceTab);
    if (!tabItem) {
      return;
    }

    let deviceTabs = this.idToTab[deviceTab.mqttId as string] || [];
    deviceTabs.push(tabItem);
    this.idToTab[deviceTab.mqttId as string] = deviceTabs;
    this.tabToId.set(deviceTab, deviceTab.mqttId);
    this.updateState(deviceTabs);
  }
}
