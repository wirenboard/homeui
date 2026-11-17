import { makeAutoObservable } from 'mobx';
import { type BooleanStore } from './boolean-store';
import { type NumberStore } from './number-store';
import { type OneOfStore } from './one-of-store';
import { type StringStore } from './string-store';

export class FormStore {
  public type = 'object';
  public name: string;
  public formColumns?: number;
  public params: Record<string, StringStore | NumberStore | BooleanStore | OneOfStore | FormStore>;

  constructor(
    name: string,
    params?: Record<string, StringStore | NumberStore | BooleanStore | OneOfStore | FormStore>,
  ) {
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
    // @ts-ignore
    return Object.values(this.params).some((v) => v.hasErrors);
  }

  get hasProperties() {
    return !!Object.keys(this.params).length;
  }

  get value() {
    return Object.entries(this.params).reduce((obj, [key, value]) => {
      // @ts-ignore
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
