'use strict';

import { makeAutoObservable, makeObservable, observable, computed, action } from 'mobx';
import { cloneDeep, isEqual } from 'lodash';
import i18n from '../../i18n/react/config';

function getTranslation(key, translations) {
  return translations[i18n.language]?.[key] || translations?.en?.[key] || key;
}

export function makeSerialPortTabName(data, schema) {
  return data?.path?.replace(/^\/dev\/tty/, '');
}

export function makeTcpPortTabName(data, schema) {
  return `TCP ${data.address || ''}:${data.port || ''}`;
}

export function makeModbusTcpPortTabName(data, schema) {
  return `MODBUS TCP ${data.address || ''}:${data.port || ''}`;
}

export function makeDeviceTabName(data, schema) {
  return `${data.slave_id || ''} ` + getTranslation(schema.title, schema.translations);
}

export class Tab {
  constructor(type, data, schema, nameGenerationFn) {
    this.name = '';
    this.type = type;
    this.data = data;
    this.editedData = cloneDeep(data);
    this.schema = schema;
    this.isValid = true;
    this.isDirty = false;
    this.hidden = false;
    this.collapsed = false;
    this.nameGenerationFn = nameGenerationFn;
    this.children = [];

    this.updateName();

    makeObservable(this, {
      name: observable,
      isValid: observable,
      isDirty: observable,
      hidden: observable,
      collapsed: observable,
      setData: action.bound,
      updateName: action,
      commitData: action,
      collapse: action.bound,
      restore: action.bound,
      children: observable,
      hasChildren: computed,
      hasErrors: computed,
    });
  }

  updateName() {
    this.name = this.nameGenerationFn(this.editedData, this.schema);
  }

  setData(data, errors) {
    this.isDirty = !isEqual(this.data, data);
    this.editedData = cloneDeep(data);
    this.isValid = errors.length == 0;
    this.updateName();
  }

  commitData() {
    this.data = cloneDeep(this.editedData);
    this.isValid = true;
    this.isDirty = false;
  }

  collapse() {
    this.children.forEach(child => {
      child.hidden = true;
    });
    this.collapsed = true;
  }

  restore() {
    this.children.forEach(child => {
      child.hidden = false;
    });
    this.collapsed = false;
  }

  get hasChildren() {
    return this.children.length != 0;
  }

  get childrenHasErrors() {
    return this.children.some(child => child.hasErrors);
  }

  get hasErrors() {
    return !this.isValid || this.childrenHasErrors;
  }
}

export class TabsStore {
  constructor() {
    this.items = [];
    this.selectedTabIndex = 0;
    this.hasNewOrDeletedItems = false;

    makeAutoObservable(this);
  }

  addPortTab(tab, initial) {
    this.items.push(tab);
    if (!initial) {
      this.selectedTabIndex = this.items.length - 1;
      this.hasNewOrDeletedItems = true;
    }
    tab.children.forEach(child => this.items.push(child));
  }

  addDeviceTab(portTab, deviceTab, initial) {
    let portTabIndex = this.items.indexOf(portTab);
    if (portTabIndex == -1) {
      return;
    }
    this.items[portTabIndex].children.push(deviceTab);
    this.items[portTabIndex].restore();
    let i = portTabIndex + 1;
    while (i < this.items.length && this.items[i]?.type != 'port') {
      i++;
    }
    this.items.splice(i, 0, deviceTab);
    if (!initial) {
      this.selectedTabIndex = i;
      this.hasNewOrDeletedItems = true;
    }
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
    if (this.items[this.selectedTabIndex]?.type == 'port') {
      while (
        this.selectedTabIndex + count < this.items.length &&
        this.items[this.selectedTabIndex + count]?.type == 'device'
      ) {
        count++;
      }
    }
    this.items.splice(this.selectedTabIndex, count);
    this.selectedTabIndex = 0;
    this.hasNewOrDeletedItems = true;
  }

  get selectedPortTab() {
    let i = this.selectedTabIndex;
    while (i >= 0 && this.items[i]?.type != 'port') {
      i--;
    }
    if (i >= this.items.length) {
      return undefined;
    }
    return this.items[i];
  }

  get portTabs() {
    return this.items.filter(item => {
      return item.type == 'port';
    });
  }

  get isValid() {
    return this.items.every(item => item.isValid);
  }

  get isDirty() {
    return this.hasNewOrDeletedItems || this.items.some(item => item.isDirty);
  }

  get isEmpty() {
    return this.items.length == 0;
  }

  submit() {
    this.items.forEach(item => item.submit());
    this.hasNewOrDeletedItems = false;
  }

  clear() {
    this.items.splice(0, this.items.length);
    this.hasNewOrDeletedItems = false;
  }
}
