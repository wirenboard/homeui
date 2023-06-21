'use strict';

import { makeAutoObservable } from 'mobx';
import { createViewModel } from 'mobx-utils';

export class FormStore {
  constructor(title) {
    this.title = title;
    this.params = {};

    makeAutoObservable(this);
  }

  add(key, param) {
    this.params[key] = createViewModel(param);
  }

  remove(key) {
    delete this.params[key];
  }

  setValue(value) {
    Object.entries(this.params).forEach(([k, v]) => {
      v.setValue((value && value.hasOwnProperty(k)) ? value[k] : undefined);
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
      obj[key] = value.value;
      return obj;
    }, {});
  }
}
