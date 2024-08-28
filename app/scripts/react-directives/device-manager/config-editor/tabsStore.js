'use strict';

import { action, makeAutoObservable, makeObservable, observable, reaction } from 'mobx';

function getMqttIdFromTopic(topic) {
  const components = topic.split('/');
  return components?.[2];
}

class UniqueMqttIdChecker {
  constructor() {
    this.idToTab = {};
    this.tabToId = new Map();
  }

  updateState(deviceTabsWithSameId) {
    deviceTabsWithSameId.forEach((tabItem, index, arr) => {
      let others = [];
      if (tabItem.tab.slaveId !== undefined) {
        others = arr.filter(tab => tab != tabItem);
      }
      tabItem.tab.setDevicesWithTheSameId(others.map(d => `${d.tab.name} (${d.port.name})`));
    });
  }

  addTab(portTab, deviceTab) {
    const disposer = reaction(
      () => {
        return deviceTab.editedData;
      },
      () => {
        this.updateTab(deviceTab);
      }
    );
    const id = deviceTab.mqttId;
    this.idToTab[id] ??= [];
    this.idToTab[id].push({ tab: deviceTab, port: portTab, disposer: disposer });
    this.tabToId.set(deviceTab, id);
    this.updateState(this.idToTab[id]);
  }

  extractTabItem(id, deviceTab) {
    let deviceTabs = this.idToTab[id] || [];
    let tabIndex = deviceTabs.findIndex(tab => tab.tab === deviceTab);
    if (tabIndex == -1) {
      return;
    }
    const tabItem = deviceTabs[tabIndex];
    deviceTabs.splice(tabIndex, 1);
    this.idToTab[id] = deviceTabs;
    this.tabToId.delete(deviceTab);
    this.updateState(deviceTabs);
    return tabItem;
  }

  removeTab(deviceTab) {
    this.extractTabItem(deviceTab.mqttId, deviceTab).disposer();
  }

  updateTab(deviceTab) {
    const id = this.tabToId.get(deviceTab);
    if (id === undefined || id == deviceTab.mqttId) {
      return;
    }

    const tabItem = this.extractTabItem(id, deviceTab);
    if (!tabItem) {
      return;
    }

    let deviceTabs = this.idToTab[deviceTab.mqttId] || [];
    deviceTabs.push(tabItem);
    this.idToTab[deviceTab.mqttId] = deviceTabs;
    this.tabToId.set(deviceTab, deviceTab.mqttId);
    this.updateState(deviceTabs);
  }
}

export const TabType = {
  PORT: 'port',
  DEVICE: 'device',
  SETTINGS: 'settings',
};

export class MobileModeTabsStore {
  constructor(toMobileContent, toTabs) {
    this.inMobileMode = false;
    this.tabsPanelIsActive = true;
    this.toMobileContent = toMobileContent;
    this.toTabs = toTabs;

    makeObservable(this, {
      inMobileMode: observable,
      tabsPanelIsActive: observable,
      showTabsPanel: action.bound,
      showContentPanel: action.bound,
      setMobileMode: action.bound,
      movedToTabsPanel: action,
    });
  }

  showTabsPanel() {
    this.movedToTabsPanel();
    this.toTabs();
  }

  showContentPanel() {
    this.tabsPanelIsActive = false;
    this.toMobileContent();
  }

  movedToTabsPanel() {
    this.tabsPanelIsActive = true;
  }

  setMobileMode(value) {
    if (this.inMobileMode != value) {
      this.inMobileMode = value;
      this.tabsPanelIsActive = true;
    }
  }
}

export class TabsStore {
  constructor(toMobileContent, toTabs) {
    this.items = [];
    this.selectedTabIndex = 0;
    // Has added, deleted items or items with changed type
    this.hasModifiedStructure = false;
    this.mobileModeStore = new MobileModeTabsStore(toMobileContent, toTabs);
    this.uniqueMqttIdChecker = new UniqueMqttIdChecker();

    makeAutoObservable(this);
  }

  addPortTab(tab, initial) {
    let i = this.items.length;
    if (i > 0 && this.items[i - 1].type == TabType.SETTINGS) {
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
    tab.children.forEach(child => {
      i++;
      this.items.splice(i, 0, child);
      this.uniqueMqttIdChecker.addTab(tab, child);
    });
  }

  addDeviceTab(portTab, deviceTab, selectTab) {
    let portTabIndex = this.items.indexOf(portTab);
    if (portTabIndex == -1) {
      return;
    }
    portTab.addChildren(deviceTab);
    portTab.restore();
    this.uniqueMqttIdChecker.addTab(portTab, deviceTab);
    let i = portTabIndex + 1;
    while (i < this.items.length && this.items[i]?.type == TabType.DEVICE) {
      i++;
    }
    this.items.splice(i, 0, deviceTab);
    this.hasModifiedStructure = true;
    if (selectTab) {
      this.onSelectTab(i, this.selectedTabIndex);
    }
  }

  addSettingsTab(tab) {
    this.items.push(tab);
  }

  onSelectTab(index, lastIndex) {
    this.selectedTabIndex = index;
    if (this.mobileModeStore.inMobileMode) {
      this.mobileModeStore.showContentPanel();
    }
    let tab = this.items[index];
    if (tab.type == TabType.DEVICE) {
      tab.loadSchema();
    }
    return true;
  }

  selectTab(tab) {
    let index = this.items.indexOf(tab);
    if (index != -1) {
      this.onSelectTab(index, this.selectedTabIndex);
    }
  }

  deleteSelectedTab() {
    const tab = this.items[this.selectedTabIndex];
    switch (tab?.type) {
      case TabType.PORT: {
        tab.children.forEach(deviceTab => this.uniqueMqttIdChecker.removeTab(deviceTab));
        this.items.splice(this.selectedTabIndex, tab.children.length + 1);
        break;
      }
      case TabType.DEVICE: {
        let portTab = this.selectedPortTab;
        const childIndex = portTab.children.indexOf(tab);
        portTab.deleteChildren(childIndex);
        this.items.splice(this.selectedTabIndex, 1);
        this.uniqueMqttIdChecker.removeTab(tab);
        if (
          (childIndex == 0 && !portTab.children.length) ||
          (childIndex != 0 && childIndex == portTab.children.length)
        ) {
          this.selectedTabIndex = this.selectedTabIndex - 1;
        }
        break;
      }
      default: {
        return;
      }
    }
    this.hasModifiedStructure = true;
    this.mobileModeStore.showTabsPanel();
    this.onSelectTab(this.selectedTabIndex);
  }

  get selectedPortTab() {
    let i = this.selectedTabIndex;
    while (i >= 0 && this.items[i]?.type != TabType.PORT) {
      i--;
    }
    if (i >= this.items.length) {
      return undefined;
    }
    return this.items[i];
  }

  get selectedTab() {
    return this.items?.[this.selectedTabIndex];
  }

  get portTabs() {
    return this.items.filter(item => item.type == TabType.PORT);
  }

  get hasInvalidConfig() {
    return this.items.some(item => item.hasInvalidConfig);
  }

  get isDirty() {
    return this.hasModifiedStructure || this.items.some(item => item.isDirty);
  }

  get isEmpty() {
    return this.items.length == 0;
  }

  get hasPortTabs() {
    return this.items.some(item => item.type == TabType.PORT);
  }

  commitData() {
    this.items.forEach(item => item.commitData());
    this.hasModifiedStructure = false;
  }

  clear() {
    this.items.splice(0, this.items.length);
    this.hasModifiedStructure = false;
  }

  setModifiedStructure() {
    this.hasModifiedStructure = true;
  }

  findDeviceTabByTopic(topic) {
    const mqttId = getMqttIdFromTopic(topic);
    return this.items.find(item => {
      if (item.type == TabType.DEVICE) {
        return item.mqttId == mqttId;
      }
      return false;
    });
  }

  findPortTab(portPath) {
    return this.items.find(item => {
      if (item.type == TabType.PORT) {
        return item.path == portPath;
      }
      return false;
    });
  }
}
