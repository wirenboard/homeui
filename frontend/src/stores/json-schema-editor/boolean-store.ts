import { observable, action, makeObservable } from 'mobx';
import { MistypedValue } from './mistyped-value';
import { getDefaultBooleanValue } from './schema-helpers';
import type { JsonSchema, ValidationError, PropertyStore } from './types';

export class BooleanStore implements PropertyStore {
  public value: MistypedValue | boolean | undefined;
  public schema: JsonSchema;
  public isDirty: boolean = false;
  public error: ValidationError | undefined;

  readonly storeType = 'boolean';
  readonly required: boolean;
  readonly defaultText = '';

  private _initialValue: MistypedValue | boolean | undefined;

  constructor(schema: JsonSchema, initialValue: unknown, required: boolean) {
    if (typeof initialValue === 'boolean') {
      this.value = initialValue;
    } else if (initialValue === undefined) {
      if (schema.options?.wb?.show_editor) {
        this.value = getDefaultBooleanValue(schema) ?? false;
      } else {
        this.value = undefined;
      }
    } else {
      this.value = new MistypedValue(initialValue);
    }
    this.schema = schema;
    this._initialValue = this.value;
    this.required = required;

    this._checkConstraints();

    makeObservable(this, {
      value: observable.ref,
      error: observable.ref,
      isDirty: observable,
      setValue: action,
      setUndefined: action,
      _checkConstraints: action,
      commit: action,
      reset: action,
    });
  }

  _checkConstraints(): void {
    if (this.value instanceof MistypedValue) {
      this.error = { key: 'json-editor.errors.not-a-boolean' };
      return;
    }
    const forbidUndefined = this.schema.options?.wb?.show_editor || this.required || this.schema.options?.show_opt_in;
    if (forbidUndefined && this.value === undefined) {
      this.error = { key: 'json-editor.errors.required' };
      return;
    }
    this.error = undefined;
  }

  setValue(value: unknown): void {
    if (typeof value !== 'boolean') {
      this.value = new MistypedValue(value);
    } else {
      this.value = value;
    }
    this.isDirty = this.value !== this._initialValue;
    this._checkConstraints();
  }

  setUndefined(): void {
    this.value = undefined;
    this.isDirty = this.value !== this._initialValue;
    this._checkConstraints();
  }

  setDefault(): void {
    this.setValue(getDefaultBooleanValue(this.schema) ?? false);
  }

  get hasErrors(): boolean {
    return !!this.error;
  }

  commit(): void {
    this._initialValue = this.value;
    this.isDirty = false;
  }

  reset(): void {
    this.value = this._initialValue;
    this.isDirty = false;
    this._checkConstraints();
  }
}
