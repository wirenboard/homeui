import { makeObservable, action, computed, observable } from 'mobx';
import { MistypedValue } from './mistyped-value';
import { StoreBuilder } from './store-builder';
import type { JsonSchema, PropertyStore, JsonArray } from './types';

export class ArrayStore implements PropertyStore {
  public schema: JsonSchema;
  public items: PropertyStore[] = [];
  public required: boolean;
  public isUndefined: boolean = false;

  readonly storeType = 'array';
  readonly error = undefined;
  readonly defaultText = '';

  private _builder: StoreBuilder;
  private _itemsSchema: JsonSchema[] | JsonSchema | undefined;
  private _hasStructureChanges: boolean = false;

  constructor(schema: JsonSchema, initialValue: unknown, required: boolean, builder: StoreBuilder) {
    console.log(initialValue);
    this.schema = schema;
    this.required = required;
    this._builder = builder;
    if (schema.format === 'wb-byte-array') {
      // Special handling of byte arrays
      this._itemsSchema = (schema.items as JsonSchema).oneOf[0];
    } else {
      this._itemsSchema = schema.items;
    }

    if (initialValue === undefined || schema.items === undefined) {
      this.isUndefined = true;
    } else {
      if (Array.isArray(initialValue)) {
        initialValue.forEach((item, index) => {
          const itemSchema = Array.isArray(this._itemsSchema) ? this._itemsSchema[index] : this._itemsSchema;
          const itemStore = this._builder.createStore(itemSchema as JsonSchema, item, false);
          if (itemStore) {
            this.items.push(itemStore);
          }
        });
      }
      // If initial value is not an array, treat it as empty array
    }

    makeObservable(this, {
      items: observable.shallow,
      isUndefined: observable,
      value: computed,
      hasErrors: computed,
      isDirty: computed,
      commit: action,
      reset: action,
      setUndefined: action,
      setDefault: action,
      addItem: action,
      removeItem: action,
    });
  }

  get hasErrors() {
    return this.items.some((item) => item.hasErrors);
  }

  get isDirty() {
    return this._hasStructureChanges || this.items.some((item) => item.isDirty);
  }

  get value(): JsonArray | undefined {
    if (this.isUndefined) {
      return undefined;
    }
    let res: JsonArray = [];
    for (const item of this.items) {
      const itemValue = item.value;
      if (itemValue !== undefined && !(itemValue instanceof MistypedValue)) {
        res.push(itemValue);
      }
    }
    return res;
  }

  setUndefined() {
    if (this.isUndefined) {
      return;
    }
    this.isUndefined = true;
    this.items = [];
    this._hasStructureChanges = true;
  }

  setDefault() {
    if (Array.isArray(this._itemsSchema)) {
      this.items.forEach((item) => item.setDefault());
      return;
    }
    if (this.items.length) {
      this.items = [];
      this._hasStructureChanges = true;
    }
  }

  commit() {
    this.items.forEach((item) => {
      item.commit();
    });
    this._hasStructureChanges = false;
  }

  reset() {
    this.items.forEach((item) => {
      item.reset();
    });
    this._hasStructureChanges = true;
  }

  addItem() {
    if (Array.isArray(this._itemsSchema)) {
      return;
    }
    const itemStore = this._builder.createStore(this._itemsSchema, undefined, false);
    if (itemStore) {
      itemStore.setDefault();
      this.items.push(itemStore);
      this.isUndefined = false;
      this._hasStructureChanges = true;
    }
  }

  removeItem(index: number) {
    if (index < 0 || index >= this.items.length) {
      return;
    }
    this.items.splice(index, 1);
    this._hasStructureChanges = true;
  }

  moveUpItem(index: number) {
    if (index <= 0 || index >= this.items.length) {
      return;
    }
    const item = this.items[index];
    this.items[index] = this.items[index - 1];
    this.items[index - 1] = item;
    this._hasStructureChanges = true;
  }

  moveDownItem(index: number) {
    if (index < 0 || index >= this.items.length - 1) {
      return;
    }
    const item = this.items[index];
    this.items[index] = this.items[index + 1];
    this.items[index + 1] = item;
    this._hasStructureChanges = true;
  }
}
