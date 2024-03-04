'use strict';

import { makeAutoObservable } from 'mobx';

export const TabType = {
  PORT: 'port',
  DEVICE: 'device',
  SETTINGS: 'settings',
};

export class TabsStore {
  constructor() {
    this.items = [];
    this.selectedTabIndex = 0;
    // Has added, deleted items or items with changed type
    this.hasModifiedStructure = false;

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
    }
  }

  addSettingsTab(tab) {
    this.items.push(tab);
  }

  onSelectTab(index, lastIndex) {
    this.selectedTabIndex = index;
    return true;
  }

  selectTab(index) {
    this.selectedTabIndex = index;
  }

  deleteSelectedTab() {
    let count = 1;
    const tab = this.items[this.selectedTabIndex];
    if (tab?.type == TabType.PORT) {
      count = count + tab.children.length;
    } else {
      let portTab = this.selectedPortTab;
      portTab.children.splice(portTab.children.indexOf(tab, 1));
    }
    this.items.splice(this.selectedTabIndex, count);
    this.selectedTabIndex = 0;
    this.hasModifiedStructure = true;
  }

  copySelectedTab() {
    let portTab = this.selectedPortTab;
    this.addDeviceTab(portTab, this.items[this.selectedTabIndex].getCopy());
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
}
