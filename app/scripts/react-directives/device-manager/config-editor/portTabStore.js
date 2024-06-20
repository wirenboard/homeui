'use strict';

import { makeObservable, observable, computed, action, autorun } from 'mobx';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import i18n from '../../../i18n/react/config';
import { getTranslation } from './jsonSchemaUtils';
import { TabType } from './tabsStore';

function checkDuplicateSlaveIds(deviceTabs) {
  const tabsBySlaveId = deviceTabs.reduce((acc, tab) => {
    if (tab.isModbusDevice) {
      acc[tab.editedData.slave_id] ??= [];
      acc[tab.editedData.slave_id].push(tab);
    }
    return acc;
  }, {});
  Object.values(tabsBySlaveId).forEach(tabs => {
    if (tabs.length == 1) {
      tabs[0].setSlaveIdIsDuplicate(false);
    } else {
      tabs.forEach(tab => tab.setSlaveIdIsDuplicate(true));
    }
  });
}

export function makeSerialPortTabName(data) {
  return data?.path?.replace(/^\/dev\/tty/, '');
}

export function makeTcpPortTabName(data) {
  return `TCP ${data.address || ''}:${data.port || ''}`;
}

export function makeModbusTcpPortTabName(data) {
  return `MODBUS TCP ${data.address || ''}:${data.port || ''}`;
}

export class PortTab {
  constructor(data, schema, nameGenerationFn) {
    this.name = '';
    this.title = getTranslation(schema.title, i18n.language, schema.translations);
    this.type = TabType.PORT;
    this.data = data;
    this.editedData = cloneDeep(data);
    this.schema = schema;
    this.hasJsonValidationErrors = false;
    this.isDirty = false;
    this.collapsed = false;
    this.nameGenerationFn = nameGenerationFn;
    this.children = [];
    this.reactionDisposers = [];

    this.updateName();

    makeObservable(this, {
      name: observable,
      hasJsonValidationErrors: observable,
      isDirty: observable,
      collapsed: observable,
      setData: action.bound,
      updateName: action,
      commitData: action,
      addChildren: action,
      deleteChildren: action,
      collapse: action.bound,
      restore: action.bound,
      children: observable,
      hasChildren: computed,
      hasInvalidConfig: computed,
    });
  }

  updateName() {
    this.name = this.nameGenerationFn(this.editedData, this.schema);
  }

  setData(data, errors) {
    this.isDirty = !isEqual(this.data, data);
    this.editedData = cloneDeep(data);
    this.hasJsonValidationErrors = errors.length != 0;
    this.updateName();
  }

  commitData() {
    this.data = cloneDeep(this.editedData);
    this.hasJsonValidationErrors = false;
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

  addChildren(deviceTab) {
    const disposer = autorun(() => checkDuplicateSlaveIds(this.children));
    this.children.push(deviceTab);
    this.reactionDisposers.push(disposer);
  }

  deleteChildren(index) {
    if (this.reactionDisposers.length > index) {
      this.reactionDisposers[index]();
      this.reactionDisposers.splice(index, 1);
    }
    this.children.splice(index, 1);
  }

  get hasChildren() {
    return this.children.length != 0;
  }

  get childrenHasInvalidConfig() {
    return this.children.some(child => child.hasInvalidConfig);
  }

  get hasInvalidConfig() {
    return this.hasJsonValidationErrors || this.childrenHasInvalidConfig;
  }
}
