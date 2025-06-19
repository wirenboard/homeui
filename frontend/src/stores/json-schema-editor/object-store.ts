import { makeObservable, action, computed } from 'mobx';
import BooleanStore from './boolean-store';
import MistypedValue from './mistyped-value';
import NumberStore from './number-store';
import StringStore from './string-store';
import type { JsonSchema } from './types';

type ParamStore = ObjectStore | NumberStore | BooleanStore | StringStore;

export class ObjectStoreParam {
  public key: string;
  public store: ParamStore;

  constructor(key: string, store: ParamStore) {
    this.key = key;
    this.store = store;
  }
}

export class ObjectStore {
  public schema: JsonSchema;
  public params: ObjectStoreParam[];
  public required: boolean;
  readonly error = undefined;
  readonly defaultText = '';

  private _paramByKey: Record<string, ObjectStoreParam> = {};

  constructor(schema: JsonSchema, params: ObjectStoreParam[]) {
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

  get hasErrors() {
    return this.params.some((param) => param.store.hasErrors);
  }

  get isDirty() {
    return this.params.some((param) => param.store.isDirty);
  }

  get hasProperties() {
    return !!this.params.length;
  }

  get value(): Record<string, number | string | boolean> {
    return this.params.reduce((acc, param) => {
      if (param.store.value === undefined || param.store.value instanceof MistypedValue) {
        return acc;
      }
      acc[param.key] = param.store.value;
      return acc;
    }, {});
  }

  setUndefined() {}

  setDefault() {
    this.params.forEach((param) => {
      if (param.store.required || param.store.schema.options?.wb?.show_editor) {
        param.store.setDefault();
      } else {
        param.store.setUndefined();
      }
    });
  }

  submit() {
    this.params.forEach((param) => {
      param.store.submit();
    });
  }

  reset() {
    this.params.forEach((param) => {
      param.store.reset();
    });
  }
}
