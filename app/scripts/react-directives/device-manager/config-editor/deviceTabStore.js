'use strict';

import { makeObservable, observable, action, runInAction, computed } from 'mobx';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { getDefaultObject } from './jsonSchemaUtils';
import { TabType } from './tabsStore';
import i18n from '../../../i18n/react/config';

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
    this.isDeprecated = deviceTypesStore.isDeprecated(deviceType);
    this.schema = undefined;
    this.isUnknownType = deviceTypesStore.isUnknown(deviceType);
    this.error = '';
    this.acceptJsonEditorInitial = true;

    this.updateName();

    makeObservable(this, {
      name: observable,
      isValid: observable,
      isDirty: observable,
      hidden: observable,
      isDeprecated: observable,
      deviceType: observable,
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

  setData(data, errors, initial) {
    // On first start json-editor modifies json according to defaults.
    // It is not a config change, so use resulting object as initial device config
    if (initial && this.acceptJsonEditorInitial) {
      this.data = cloneDeep(data);
      this.acceptJsonEditorInitial = false;
    }
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
      const currentSlaveId = this.editedData.slave_id;
      this.editedData = getDefaultObject(this.schema);
      this.editedData.slave_id = currentSlaveId;
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
    let tab = new DeviceTab(dataCopy, this.deviceType, this.deviceTypesStore);
    tab.loadSchema();
    return tab;
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
    this.loading = true;
    try {
      this.schema = await this.deviceTypesStore.getSchema(this.deviceType);
    } catch (err) {
      runInAction(() => {
        this.error = err.message;
        this.loading = false;
      });
      return;
    }
    runInAction(() => {
      this.acceptJsonEditorInitial = true;
      this.editedData = getDefaultObject(this.schema);
      this.data = cloneDeep(this.editedData);
      this.isDirty = false;
      this.isValid = false;
      this.updateName();
      this.loading = false;
    });
  }

  get hasErrors() {
    return !this.isValid || this.error || this.isUnknownType;
  }
}
