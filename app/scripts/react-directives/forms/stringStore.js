'use strict';

import { makeAutoObservable } from 'mobx';

export class StringStore {
  constructor({ name, description, value, placeholder, validator, defaultText }) {
    this.type = 'string';
    this.name = name;
    this.description = description;
    this.validator = validator;
    this.placeholder = placeholder;
    this.defaultText = defaultText;
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

  setDefaultText(text) {
    this.defaultText = text;
  }

  get hasErrors() {
    return !!this.error;
  }
}
