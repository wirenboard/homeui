import { makeObservable, action, computed, observable } from 'mobx';
import BooleanStore from './boolean-store';
import MistypedValue from './mistyped-value';
import NumberStore from './number-store';
import StringStore from './string-store';
import type { JsonSchema } from './types';

export class ObjectStoreParam {
  public key: string;
  public store: ObjectStore | NumberStore | BooleanStore | StringStore;
  public disabled: boolean;
  public hasPermanentEditor: boolean;

  constructor(key: string, store: ObjectStore | NumberStore | BooleanStore | StringStore) {
    this.key = key;
    this.store = store;
    this.hasPermanentEditor = this.store.required ||
      this.store.schema.options?.wb?.show_editor ||
      this.store.schema.options?.show_opt_in ||
      this.store.schema.options?.hidden;
    this.disabled = !this.hasPermanentEditor;

    makeObservable(this, {
      disabled: observable,
      enable: action,
      disable: action,
    });
  }

  enable() {
    if (!this.hasPermanentEditor && this.disabled) {
      this.store.setDefault();
      this.disabled = false;
    }
  }

  disable() {
    if (!this.hasPermanentEditor && !this.disabled) {
      this.disabled = true;
      this.store.setUndefined();
    }
  }
}

function comparePropertyOrder([key1, schema1], [key2, schema2]) {
  const order1 = schema1.propertyOrder ?? 10000;
  const order2 = schema2.propertyOrder ?? 10000;
  if (order1 === order2) {
    return key1.localeCompare(key2);
  }
  return order1 - order2;
}

const createStore = (
  schema: JsonSchema,
  initialValue: unknown,
  required: boolean
) : ObjectStore | NumberStore | StringStore | BooleanStore => {
  switch (schema.type){
    case 'boolean': return new BooleanStore(schema, initialValue, required);
    case 'string': return new StringStore(schema, initialValue, required);
    case 'integer':
    case 'number': return new NumberStore(schema, initialValue, required);
    case 'object': return new ObjectStore(schema, initialValue, required);
  }
};

export class ObjectStore {
  public schema: JsonSchema;
  public params: ObjectStoreParam[] = [];
  public required: boolean;
  public isUndefined: boolean = false;
  readonly error = undefined;
  readonly defaultText = '';

  private _paramByKey: Record<string, ObjectStoreParam> = {};

  constructor(schema: JsonSchema, initialValue: unknown, required: boolean) {
    this.schema = schema;
    this.required = required;

    if (schema?.properties) {
      Object.entries(schema.properties)
        .sort(comparePropertyOrder)
        .forEach(([key, value]) => {
          const param = new ObjectStoreParam(
            key,
            createStore(value, initialValue?.[key], !!schema.required?.includes(key))
          );
          this.params.push(param);
          this._paramByKey[key] = param;
        });
    }

    if (initialValue === undefined) {
      this.isUndefined = true;
    }

    makeObservable(this, {
      isUndefined: observable,
      value: computed,
      hasErrors: computed,
      isDirty: computed,
      commit: action,
      reset: action,
      setUndefined: action,
      setDefault: action,
    });
  }

  get hasErrors() {
    return this.params.some((param) => !param.disabled && param.store.hasErrors);
  }

  get isDirty() {
    return this.params.some((param) => param.store.isDirty);
  }

  get hasProperties() {
    return !!this.params.length;
  }

  get value(): Record<string, number | string | boolean> | undefined {
    if (this.isUndefined) {
      return undefined;
    }
    return this.params.reduce((acc, param) => {
      if (param.store.value === undefined || param.store.value instanceof MistypedValue) {
        return acc;
      }
      acc[param.key] = param.store.value;
      return acc;
    }, {});
  }

  setUndefined() {
    this.isUndefined = true;
  }

  setDefault() {
    this.params.forEach((param) => {
      if (param.store.required || param.store.schema.options?.wb?.show_editor) {
        param.store.setDefault();
      } else {
        param.store.setUndefined();
      }
    });
  }

  commit() {
    this.params.forEach((param) => {
      param.store.commit();
    });
  }

  reset() {
    this.params.forEach((param) => {
      param.store.reset();
    });
  }

  getParamByKey(key: string): ObjectStoreParam | undefined {
    return this._paramByKey[key];
  }
}
