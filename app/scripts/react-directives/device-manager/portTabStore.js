'use strict';

import { makeObservable, observable, computed, action } from 'mobx';
import { cloneDeep, isEqual } from 'lodash';
import i18n from '../../i18n/react/config';
import { getTranslation } from './jsonSchemaUtils';
import { TabType } from './tabsStore';

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
    this.isValid = true;
    this.isDirty = false;
    this.collapsed = false;
    this.nameGenerationFn = nameGenerationFn;
    this.children = [];

    this.updateName();

    makeObservable(this, {
      name: observable,
      isValid: observable,
      isDirty: observable,
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
    return this.children.some(child => !child.isValid);
  }

  get hasErrors() {
    return !this.isValid || this.childrenHasErrors;
  }
}
