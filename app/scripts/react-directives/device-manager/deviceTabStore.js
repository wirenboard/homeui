'use strict';

import { makeObservable, observable, action, runInAction, computed } from 'mobx';
import { cloneDeep, isEqual } from 'lodash';
import { getDefaultObject } from './jsonSchemaUtils';
import { TabType } from './tabsStore';
import i18n from '../../i18n/react/config';

export class DeviceTab {
  constructor(data, deviceType, deviceTypesStore) {
    this.name = '';
    this.type = TabType.DEVICE;
    this.data = data;
    this.editedData = cloneDeep(data);
    this.deviceTypesStore = deviceTypesStore;
    this.deviceType = deviceType;
    this.isValid = true;
    this.isDirty = false;
    this.hidden = false;
    this.loading = true;
    this.isDeprecated = false;
    this.schema = undefined;
    this.isUnknownType = deviceTypesStore.isUnknown(deviceType);
    this.error = '';

    this.updateName();

    makeObservable(this, {
      name: observable,
      isValid: observable,
      isDirty: observable,
      hidden: observable,
      isDeprecated: observable,
      loading: observable,
      error: observable,
      setData: action.bound,
      updateName: action,
      commitData: action,
      setDeviceType: action,
      loadSchema: action,
      hasErrors: computed,
    });
  }

  updateName() {
    let name = this.deviceTypesStore.getName(this.deviceType);
    if (!name) {
      name = i18n.t('device-manager.labels.unknown-device-type');
    }
    this.name = `${this.editedData?.slave_id || ''} ` + name;
  }

  setData(data, errors) {
    this.isDirty = !isEqual(this.data, data);
    this.editedData = cloneDeep(data);
    this.isValid = errors.length == 0;
    this.updateName();
  }

  async setDeviceType(type) {
    this.loading = true;
    try {
      this.schema = await this.deviceTypesStore.getSchema(type);
    } catch (err) {
      runInAction(() => {
        this.error = err.message;
        this.loading = false;
      });
      return;
    }
    runInAction(() => {
      this.deviceType = type;
      this.isDeprecated = this.deviceTypesStore.isDeprecated(this.deviceType);
      this.data = getDefaultObject(this.schema);
      this.data.slave_id = this.editedData.slave_id;
      this.editedData = cloneDeep(this.data);
      this.isDirty = false;
      this.isValid = false;
      this.updateName();
      this.loading = false;
    });
  }

  commitData() {
    this.data = cloneDeep(this.editedData);
    this.isValid = true;
    this.isDirty = false;
  }

  getCopy() {
    let dataCopy = cloneDeep(this.editedData);
    dataCopy.slave_id = '';
    return new DeviceTab(dataCopy, this.deviceType, this.deviceTypesStore);
  }

  async loadSchema() {
    if (this.isUnknownType || this.schema !== undefined) {
      this.loading = false;
      return;
    }
    this.loading = true;
    try {
      this.schema = await this.deviceTypesStore.getSchema(this.deviceType);
    } catch (err) {
      runInAction(() => {
        this.error = err.message;
      });
    }
    runInAction(() => {
      this.isDeprecated = this.deviceTypesStore.isDeprecated(this.deviceType);
      this.loading = false;
    });
  }

  async setDefaultData() {
    await this.setDeviceType(this.deviceType);
  }

  get hasErrors() {
    return !this.isValid || this.error || this.isUnknownType;
  }
}
