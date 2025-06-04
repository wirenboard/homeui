import { observable, action, computed, makeObservable } from 'mobx';
import MistypedValue from './mistyped-value';
import { getDefaultBooleanValue } from './schema-helpers';
import { BooleanSchema, ValidationError } from './types';

export default class BooleanStore {
  public value: MistypedValue | boolean | undefined;
  public schema: BooleanSchema;
  public error: ValidationError | undefined;
  public required: boolean;

  readonly defaultText = '';

  private _initialValue: MistypedValue | boolean | undefined;

  constructor(schema: BooleanSchema, initialValue: unknown, required: boolean) {
    if (typeof initialValue === 'boolean') {
      this.value = initialValue;
    } else if (initialValue === undefined) {
      this.value = schema.options?.wb?.show_editor ? getDefaultBooleanValue(schema) : undefined;
    } else {
      this.value = { type: typeof initialValue, value: String(initialValue) } as MistypedValue;
    }
    this.schema = schema;
    this._initialValue = this.value;
    this.required = required;

    this._checkConstraints();

    makeObservable(this, {
      value: observable.ref,
      error: observable.ref,
      setValue: action,
      setUndefined: action,
      _checkConstraints: action,
      isDirty: computed,
      submit: action,
      reset: action,
    });
  }

  _checkConstraints(): void {
    if (this.value instanceof MistypedValue) {
      this.error = { key: 'json-editor.errors.not-a-boolean' };
      return;
    }
    if (this.required && this.value === undefined) {
      this.error = { key: 'json-editor.errors.required' };
      return;
    }
    this.error = undefined;
  }

  setValue(value: boolean): void {
    this.value = value;
    this._checkConstraints();
  }

  setUndefined(): void {
    this.value = undefined;
    this._checkConstraints();
  }

  setDefault(): void {
    this.setValue(getDefaultBooleanValue(this.schema));
  }

  get hasErrors(): boolean {
    return !!this.error;
  }

  get isDirty(): boolean {
    return this.value !== this._initialValue;
  }

  submit(): void {
    this._initialValue = this.value;
  }

  reset(): void {
    this.value = this._initialValue;
    this._checkConstraints();
  }
}
