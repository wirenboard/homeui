import { makeObservable, action, computed, observable } from 'mobx';
import BooleanStore from './boolean-store';
import MistypedValue from './mistyped-value';
import NumberStore from './number-store';
import StringStore from './string-store';
import { ObjectSchema } from './types';

type ParamStore = NumberStore | BooleanStore | StringStore;

export class ObjectStoreParam {
  public key: string;
  public store: ParamStore;

  private _disabled: boolean;

  constructor(key: string, store: ParamStore) {
    this.key = key;
    this.store = store;
    this._disabled = !store.required && !store.schema.options?.wb?.show_editor;

    makeObservable<ObjectStoreParam, '_disabled'>(this, {
      _disabled: observable,
      isDisabled: computed,
      disable: action,
      enable: action,
    });
  }

  get isDisabled(): boolean {
    return this._disabled;
  }

  disable() {
    if (!this.store.required && !this._disabled && !this.store.schema.options?.wb?.show_editor) {
      this._disabled = true;
      this.store.setUndefined();
    }
  }

  enable() {
    if (this._disabled) {
      this.store.setDefault();
      this._disabled = false;
    }
  }
}

export default class ObjectStore {
  public schema: ObjectSchema;
  public params: ObjectStoreParam[];

  private _paramByKey: Record<string, ObjectStoreParam> = {};

  constructor(schema: ObjectSchema, params: ObjectStoreParam[]) {
    this.schema = schema;
    this.params = params;
    params.forEach((param) => {
      this._paramByKey[param.key] = param;
    });

    makeObservable(this, {
      value: computed,
      hasErrors: computed,
      isDirty: computed,
      submit: action,
      reset: action,
    });
  }

  get hasErrors(): boolean {
    return this.params.some((param) => !param.isDisabled && param.store.hasErrors);
  }

  get isDirty(): boolean {
    return this.params.some((param) => param.store.isDirty);
  }

  get hasProperties(): boolean {
    return !!this.params.length;
  }

  get value(): any {
    return this.params.reduce((acc, param) => {
      if (param.store.value === undefined || param.isDisabled || param.store.value instanceof MistypedValue) {
        return acc;
      }
      acc[param.key] = param.store.value;
      return acc;
    }, {});
  }

  setDefault(): void {
    this.params.forEach((param) => {
      if (param.store.required || param.store.schema.options?.wb?.show_editor) {
        param.store.setDefault();
      } else {
        param.disable();
      }
    });
  }

  submit(): void {
    this.params.forEach((param) => {
      param.store.submit();
    });
  }

  reset(): void {
    this.params.forEach((param) => {
      param.store.reset();
    });
  }
}
