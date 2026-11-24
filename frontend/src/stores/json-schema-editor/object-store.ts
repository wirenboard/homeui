import { makeObservable, action, comparer, computed, observable } from 'mobx';
import { exactNumberEquals } from '@/utils/exact-number';
import { MistypedValue } from './mistyped-value';
import { type StoreBuilder } from './store-builder';
import type { JsonSchema, PropertyStore, JsonObject, DependencyChoice } from './types';

const matchesDependencyChoice = (value: unknown, choice: DependencyChoice): boolean => {
  if (Array.isArray(choice)) {
    return choice.some((item) => exactNumberEquals(value, item));
  }
  return exactNumberEquals(value, choice);
};

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
    // Mirror onto the store: an enabled param (part of the object) must carry a
    // value; a disabled one may be undefined. Set here too, because a param loaded
    // with a value starts enabled without ever going through enable().
    this.store.setForbidUndefined(!this.disabled);

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
      this.store.reset();
      this.disabled = false;
      this.store.setForbidUndefined(true);
    }
    if (this.store.value === undefined) {
      this.store.setDefault();
    }
  }

  disable() {
    if (!this.disabled && !this.store.required && !this.store.schema.options?.wb?.show_editor) {
      this.disabled = true;
      this.store.setUndefined();
      this.store.setForbidUndefined(false);
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
  public required: boolean;
  public isUndefined: boolean = false;

  readonly storeType = 'object';
  readonly error = undefined;
  readonly defaultText = '';

  // All params, including the ones hidden by options.dependencies
  private _params: ObjectParamStore[] = [];
  private _paramByKey: Record<string, ObjectParamStore> = {};
  private _initialIsUndefined: boolean = false;

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
          this._params.push(param);
          this._paramByKey[key] = param;
        });
    }

    if (initialValue === undefined) {
      if (required || (schema.options?.wb?.show_editor && !schema.options?.wb?.allow_undefined)) {
        this.setDefault();
      } else {
        this.isUndefined = true;
      }
    }
    this._initialIsUndefined = this.isUndefined;

    makeObservable<ObjectStore, '_params'>(this, {
      isUndefined: observable,
      _params: observable.ref,
      params: computed({ equals: comparer.shallow }),
      value: computed,
      hasErrors: computed,
      isDirty: computed,
      commit: action,
      reset: action,
      setUndefined: action,
      setDefault: action,
      setValue: action,
      removeParamByKey: action,
    });
  }

  get params(): ObjectParamStore[] {
    const visibility = new Map<ObjectParamStore, boolean>();
    const resolve = (param: ObjectParamStore): boolean => {
      if (visibility.has(param)) {
        return visibility.get(param);
      }
      // Provisional value, so a cycle back to this param resolves as hidden instead of recursing forever
      visibility.set(param, false);
      const visible = Object.entries(param.store.schema.options?.dependencies ?? {}).every(([key, choice]) => {
        if (key === param.key) {
          return true;
        }
        const sibling = this.getParamByKey(key);
        return !!sibling &&
          resolve(sibling) &&
          matchesDependencyChoice(sibling.disabled ? undefined : sibling.store.value, choice);
      });
      visibility.set(param, visible);
      return visible;
    };
    return this._params.filter(resolve);
  }

  get hasErrors() {
    return this.params.some((param) => !param.disabled && param.store.hasErrors);
  }

  get isDirty() {
    return this.params.some((param) => param.store.isDirty);
  }

  get hasProperties() {
    return !!this._params.length;
  }

  get value(): JsonObject | undefined {
    if (this.isUndefined) {
      return undefined;
    }
    return this.params.reduce((acc, param) => {
      // reset() restores a nested object whether or not its param is disabled.
      if (param.disabled || param.store.value === undefined || param.store.value instanceof MistypedValue) {
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
    this._params.forEach((param) => param.store.setUndefined());
  }

  setDefault() {
    this._params.forEach((param) => {
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
    this._params.forEach((param) => {
      param.store.commit();
    });
    this._initialIsUndefined = this.isUndefined;
  }

  reset() {
    this._params.forEach((param) => {
      param.store.reset();
    });
    this.isUndefined = this._initialIsUndefined;
  }

  setForbidUndefined() {}

  getParamByKey(key: string): ObjectParamStore | undefined {
    return this._paramByKey[key];
  }

  removeParamByKey(key: string) {
    const param = this._paramByKey[key];
    if (param) {
      delete this._paramByKey[key];
      this._params = this._params.filter((p) => p !== param);
    }
  }
}
