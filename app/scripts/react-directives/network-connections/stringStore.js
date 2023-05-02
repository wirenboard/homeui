'use strict';

import { makeAutoObservable } from 'mobx';

export class StringStore {
  constructor({ name, description, value, placeholder, validator }) {
    this.name = name;
    this.description = description;
    this.validator = validator;
    this.placeholder = placeholder;
    this.setValue(value);

    makeAutoObservable(this);
  }

  setValue(value) {
    this.value = value || '';
    this.error = this.validator?.(this.value) ?? '';
  }

  setPlaceholder(placeholder) {
    this.placeholder = placeholder;
  }

  get hasErrors() {
    return !!this.error;
  }
}
