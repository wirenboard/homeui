'use strict';

import { makeObservable, observable, action } from 'mobx';
import { cloneDeep, isEqual } from 'lodash';
import i18n from '../../i18n/react/config';
import { getDefaultObject, getTranslation } from './jsonSchemaUtils';
import { TabType } from './tabsStore';

export class DeviceTab {
  constructor(data, deviceType, schema) {
    this.name = '';
    this.type = TabType.DEVICE;
    this.data = data;
    this.editedData = cloneDeep(data);
    this.schema = schema;
    this.deviceType = deviceType;
    this.isValid = true;
    this.isDirty = false;
    this.hidden = false;
    this.isDeprecated = !!schema?.options?.wb?.hide_from_selection;

    this.updateName();

    makeObservable(this, {
      name: observable,
      isValid: observable,
      isDirty: observable,
      hidden: observable,
      isDeprecated: observable,
      deviceType: observable,
      setData: action.bound,
      updateName: action,
      commitData: action,
      setDeviceType: action,
    });
  }

  updateName() {
    this.name =
      `${this.editedData?.slave_id || ''} ` +
      getTranslation(this.schema.title, i18n.language, this.schema.translations);
  }

  setData(data, errors) {
    this.isDirty = !isEqual(this.data, data);
    this.editedData = cloneDeep(data);
    this.isValid = errors.length == 0;
    this.updateName();
  }

  setDeviceType(type, schema) {
    this.schema = schema;
    this.deviceType = type;
    this.data = getDefaultObject(schema);
    this.data.slave_id = this.editedData.slave_id;
    this.editedData = cloneDeep(this.data);
    this.isDirty = false;
    this.isValid = true;
    this.isDeprecated = !!schema?.options?.wb?.hide_from_selection;
    this.updateName();
  }

  commitData() {
    this.data = cloneDeep(this.editedData);
    this.isValid = true;
    this.isDirty = false;
  }

  getCopy() {
    let dataCopy = cloneDeep(this.editedData);
    dataCopy.slave_id = '';
    return new DeviceTab(dataCopy, this.deviceType, this.schema);
  }
}
