'use strict';

import { action, makeAutoObservable, makeObservable, observable } from 'mobx';

export const TabType = {
  PORT: 'port',
  DEVICE: 'device',
  SETTINGS: 'settings',
};

export class MobileModeTabsStore {
  constructor() {
    this.inMobileMode = false;
    this.tabsPanelIsActive = true;

    makeObservable(this, {
      inMobileMode: observable,
      tabsPanelIsActive: observable,
      showTabsPanel: action.bound,
      showContentPanel: action.bound,
      setMobileMode: action.bound,
    });
  }

  showTabsPanel() {
    this.tabsPanelIsActive = true;
  }

  showContentPanel() {
    this.tabsPanelIsActive = false;
  }

  setMobileMode(value) {
    if (this.inMobileMode != value) {
      this.inMobileMode = value;
      this.tabsPanelIsActive = true;
    }
  }
}

export class TabsStore {
  constructor() {
    this.items = [];
    this.selectedTabIndex = 0;
    // Has added, deleted items or items with changed type
    this.hasModifiedStructure = false;
    this.mobileModeStore = new MobileModeTabsStore();

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
    });
  }

  addDeviceTab(portTab, deviceTab, initial) {
    let portTabIndex = this.items.indexOf(portTab);
    if (portTabIndex == -1) {
      return;
    }
    this.items[portTabIndex].children.push(deviceTab);
    this.items[portTabIndex].restore();
    let i = portTabIndex + 1;
    while (i < this.items.length && this.items[i]?.type == TabType.DEVICE) {
      i++;
    }
    this.items.splice(i, 0, deviceTab);
    if (!initial) {
      this.selectedTabIndex = i;
      this.hasModifiedStructure = true;
      if (this.mobileModeStore.inMobileMode) {
        this.mobileModeStore.showContentPanel();
      }
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
    return true;
  }

  selectTab(index) {
    this.selectedTabIndex = index;
  }

  deleteSelectedTab() {
    const tab = this.items[this.selectedTabIndex];
    if (tab?.type == TabType.PORT) {
      this.items.splice(this.selectedTabIndex, tab.children.length + 1);
    } else if (tab?.type == TabType.DEVICE) {
      let portTab = this.selectedPortTab;
      portTab.children.splice(portTab.children.indexOf(tab), 1);
      this.items.splice(this.selectedTabIndex, 1);
    } else {
      return;
    }

    this.selectedTabIndex = 0;
    this.hasModifiedStructure = true;
    this.mobileModeStore.showTabsPanel();
  }

  copySelectedTab() {
    let portTab = this.selectedPortTab;
    this.addDeviceTab(portTab, this.items[this.selectedTabIndex].getCopy());
    if (this.mobileModeStore.inMobileMode) {
      this.mobileModeStore.showContentPanel();
    }
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

  get isValid() {
    return this.items.every(item => item.isValid);
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
}
