'use strict';

import { makeAutoObservable } from 'mobx';
import i18n from '../../i18n/react/config';

export class IntegerStore {
  constructor({ name, description, placeholder, min, max, value }) {
    this.type = 'integer';
    this.name = name;
    this.description = description;
    this.placeholder = placeholder;
    this.value = value || '';
    this.min = min;
    this.max = max;

    makeAutoObservable(this);
  }

  setValue(value) {
    if (value === '' || value === undefined) {
      this.value = '';
    } else {
      const intValue = parseInt(value);
      this.value = isNaN(intValue) ? value : intValue;
    }
  }

  get error() {
    if (!this.hasErrors) {
      return '';
    }
    const context = (this.min !== undefined ? 'min' : '') + (this.max !== undefined ? 'max' : '');
    return i18n.t('editors.errors.integer', { context: context, min: this.min, max: this.max });
  }

  get hasErrors() {
    return (
      this.value !== '' &&
      (!Number.isInteger(this.value) ||
        (this.min !== undefined && this.min > this.value) ||
        (this.max !== undefined && this.max < this.value))
    );
  }
}
