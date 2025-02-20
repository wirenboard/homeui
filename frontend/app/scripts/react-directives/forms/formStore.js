'use strict';

import { makeAutoObservable } from 'mobx';

export class FormStore {
  constructor(name) {
    this.type = 'object';
    this.name = name;
    this.params = {};

    makeAutoObservable(this);
  }

  add(key, param) {
    if (param !== null && param !== undefined) {
      this.params[key] = param;
    }
  }

  remove(key) {
    delete this.params[key];
  }

  setValue(value) {
    Object.entries(this.params).forEach(([k, v]) => {
      v.setValue(value && value.hasOwnProperty(k) ? value[k] : undefined);
    });
  }

  contains(key) {
    return this.params.hasOwnProperty(key);
  }

  get isDirty() {
    return Object.entries(this.params).some(([k, v]) => v.isDirty);
  }

  get hasErrors() {
    return Object.entries(this.params).some(([k, v]) => v.hasErrors);
  }

  get hasProperties() {
    return !!Object.keys(this.params).length;
  }

  get value() {
    return Object.entries(this.params).reduce((obj, [key, value]) => {
      if (value.strict || value.value !== undefined) {
        obj[key] = value.value;
      }
      return obj;
    }, {});
  }

  submit() {
    Object.entries(this.params).forEach(([k, v]) => v.submit());
  }

  reset() {
    Object.entries(this.params).forEach(([k, v]) => v.reset());
  }
}
