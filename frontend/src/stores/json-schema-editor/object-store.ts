import { makeObservable, action, computed, observable } from 'mobx';
import { MistypedValue } from './mistyped-value';
import { type StoreBuilder } from './store-builder';
import type { JsonSchema, PropertyStore, JsonObject } from './types';

export class ObjectParamStore {
  public key: string;
  public store: PropertyStore;
  /**
   * Indicates if the parameter is not included in resulting value.
   * The parameter's editor can be rendered or not depending on other settings.
   */
  public disabled: boolean;

  /**
   * Indicates if the parameter has a permanent editor rendered in UI.
   * The parameter can be disabled depending on other settings.
   */
  public hasPermanentEditor: boolean;

  constructor(key: string, store: PropertyStore, initialValue?: unknown) {
    this.key = key;
    this.store = store;
    this.hasPermanentEditor = this.store.required ||
      this.store.schema.options?.wb?.show_editor ||
      this.store.schema.options?.show_opt_in;
    this.disabled = !store.required && !store.schema.options?.wb?.show_editor && initialValue === undefined;

    makeObservable(this, {
      disabled: observable,
      enable: action,
      disable: action,
    });
  }

  get hidden() {
    return this.store.schema.options?.hidden;
  }

  enable() {
    if (this.disabled) {
      this.store.setDefault();
      this.disabled = false;
    }
  }

  disable() {
    if (!this.disabled && !this.store.required && !this.store.schema.options?.wb?.show_editor) {
      this.disabled = true;
      this.store.setUndefined();
    }
  }
}

export function comparePropertyOrder([key1, schema1], [key2, schema2]) {
  const order1 = schema1.propertyOrder ?? 10000;
  const order2 = schema2.propertyOrder ?? 10000;
  if (order1 === order2) {
    return key1.localeCompare(key2);
  }
  return order1 - order2;
}

export class ObjectStore implements PropertyStore {
  public schema: JsonSchema;
  public params: ObjectParamStore[] = [];
  public required: boolean;
  public isUndefined: boolean = false;

  readonly storeType = 'object';
  readonly error = undefined;
  readonly defaultText = '';

  private _paramByKey: Record<string, ObjectParamStore> = {};

  constructor(schema: JsonSchema, initialValue: unknown, required: boolean, builder: StoreBuilder) {
    this.schema = schema;
    this.required = required;

    if (schema?.properties) {
      Object.entries(schema.properties)
        .sort(comparePropertyOrder)
        .forEach(([key, value]) => {
          const initialValueToSet = initialValue?.[key];
          const store = builder.createStore(value, initialValueToSet, !!schema.required?.includes(key));
          if (!store) {
            return;
          }
          const param = new ObjectParamStore(key, store, initialValueToSet);
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
      setValue: action,
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

  get value(): JsonObject | undefined {
    if (this.isUndefined) {
      return undefined;
    }
    return this.params.reduce((acc, param) => {
      if (param.store.value === undefined || param.store.value instanceof MistypedValue) {
        return acc;
      }
      if (!param.store.required &&
           param.store.schema.options?.wb?.omit_default &&
           param.store.value === param.store.schema?.default) {
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
      const createProperty = param.store.required ||
        param.store.schema.options?.wb?.show_editor ||
        param.store.schema.defaultProperties?.includes(param.key);
      if (createProperty) {
        param.store.setDefault();
      } else {
        param.store.setUndefined();
      }
    });
    this.isUndefined = false;
  }

  setValue(value: unknown) {
    if (value === undefined) {
      this.setUndefined();
      return;
    }
    if (typeof value !== 'object' || Array.isArray(value) || value === null) {
      this.setUndefined();
      return;
    }
    Object.entries(value).forEach(([key, val]) => {
      const param = this.getParamByKey(key);
      if (param) {
        param.store.setValue(val);
      }
    });
    this.isUndefined = false;
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

  getParamByKey(key: string): ObjectParamStore | undefined {
    return this._paramByKey[key];
  }

  removeParamByKey(key: string) {
    const param = this._paramByKey[key];
    if (param) {
      delete this._paramByKey[key];
      this.params = this.params.filter((p) => p !== param);
    }
  }
}
