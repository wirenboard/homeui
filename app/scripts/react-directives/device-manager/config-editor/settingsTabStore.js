'use strict';

import { makeObservable, observable, action, computed } from 'mobx';
import { cloneDeep, isEqual } from 'lodash';
import i18n from '../../../i18n/react/config';
import { TabType } from './tabsStore';

export class SettingsTab {
  constructor(data, schema) {
    this.name = i18n.t('device-manager.labels.settings');
    this.type = TabType.SETTINGS;
    this.data = data;
    this.editedData = cloneDeep(data);
    this.schema = schema;
    this.hasJsonValidationErrors = false;
    this.isDirty = false;

    makeObservable(this, {
      hasJsonValidationErrors: observable,
      isDirty: observable,
      setData: action.bound,
      commitData: action,
      hasInvalidConfig: computed,
    });
  }

  setData(data, errors) {
    this.isDirty = !isEqual(this.data, data);
    this.editedData = cloneDeep(data);
    this.hasJsonValidationErrors = errors.length != 0;
  }

  commitData() {
    this.data = cloneDeep(this.editedData);
    this.hasJsonValidationErrors = false;
    this.isDirty = false;
  }

  get hasInvalidConfig() {
    return this.hasJsonValidationErrors;
  }
}
