'use strict';

import { makeAutoObservable } from 'mobx';

export class StringStore {
  constructor({ name, description, value, placeholder, validator }) {
    this.type = 'string';
    this.name = name;
    this.description = description;
    this.validator = validator;
    this.placeholder = placeholder;
    this.setValue(value);

    makeAutoObservable(this);
  }

  setValue(value) {
    const type = typeof value;
    if (type === 'string') {
      this.value = value;
    } else if (type === 'number') {
      this.value = String(value);
    } else {
      this.value = '';
    }
    this.error = this.validator?.(this.value) ?? '';
  }

  setPlaceholder(placeholder) {
    this.placeholder = placeholder;
  }

  get hasErrors() {
    return !!this.error;
  }
}
