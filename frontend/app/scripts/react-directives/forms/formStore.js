import { makeAutoObservable } from 'mobx';

export class FormStore {
  constructor(name, params) {
    this.type = 'object';
    this.name = name;
    this.params = params || {};

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
      // eslint-disable-next-line security/detect-object-injection
      v.setValue(value && Object.hasOwn(value, k) ? value[k] : undefined);
    });
  }

  contains(key) {
    return Object.hasOwn(this.params, key);
  }

  get isDirty() {
    return Object.values(this.params).some((v) => v.isDirty);
  }

  get hasErrors() {
    return Object.values(this.params).some((v) => v.hasErrors);
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
    Object.values(this.params).forEach((v) => v.submit());
  }

  reset() {
    Object.values(this.params).forEach((v) => v.reset());
  }
}
