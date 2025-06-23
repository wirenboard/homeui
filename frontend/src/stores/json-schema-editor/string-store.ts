import { makeObservable, observable, action, computed } from 'mobx';
import type { Option } from '@/components/dropdown';
import MistypedValue from './mistyped-value';
import { getDefaultStringValue } from './schema-helpers';
import type { JsonSchema, ValidationError } from './types';

export default class StringStore {
  public value: MistypedValue | string | undefined;
  public schema: JsonSchema;
  public error: ValidationError | undefined;
  public required: boolean;
  public enumOptions: Option<string>[] = [];

  private _initialValue: MistypedValue | string | undefined;

  constructor(schema: JsonSchema, initialValue: unknown, required: boolean) {
    if (typeof initialValue === 'string') {
      this.value = initialValue;
    } else if (initialValue === undefined) {
      this.value = schema.options?.wb?.show_editor ? getDefaultStringValue(schema) : undefined;
    } else {
      this.value = new MistypedValue(initialValue);
    }
    this._initialValue = this.value;
    this.schema = schema;
    this.required = required;

    this.enumOptions = this.schema.enum?.map((value, index) => ({
      label: this.schema.options?.enum_titles?.[index] ?? String(value),
      value: String(value),
    })) ?? [];

    this._checkConstraints();

    makeObservable(this, {
      value: observable,
      error: observable,
      setValue: action,
      setUndefined: action,
      _checkConstraints: action,
      hasErrors: computed,
      isDirty: computed,
      submit: action,
      reset: action,
    });
  }

  _checkConstraints(): void {
    if (this.value instanceof MistypedValue) {
      this.error = { key: 'json-editor.errors.not-a-string' };
      return;
    }
    if (this.value === undefined) {
      const forbidUndefined = this.schema.options?.wb?.show_editor || this.required;
      this.error = forbidUndefined ? { key: 'json-editor.errors.required' } : undefined;
      return;
    }
    if (this.schema.enum && !this.schema.enum.includes(this.value)) {
      this.error = { key: 'json-editor.errors.not-in-enum' };
      return;
    }
    if (this.schema.pattern) {
      const regExp = new RegExp(this.schema.pattern);
      if (!regExp.test(this.value)) {
        this.error = this.schema.options?.patternmessage ?
          { msg: this.schema.options.patternmessage } :
          { key: 'json-editor.errors.invalid-format' };
        return;
      }
    }
    if (this.schema.maxLength !== undefined && this.value.length > this.schema.maxLength) {
      this.error = { key: 'json-editor.errors.max-length', data: { limit: this.schema.maxLength } };
      return;
    }
    if (this.value.length < this.schema.minLength) {
      this.error = { key: 'json-editor.errors.min-length', data: { limit: this.schema.minLength } };
      return;
    }
    this.error = undefined;
  }

  setValue(value: string): void {
    this.value = value;
    this._checkConstraints();
  }

  setUndefined(): void {
    this.value = undefined;
    this._checkConstraints();
  }

  setDefault(): void {
    this.setValue(getDefaultStringValue(this.schema));
  }

  get hasErrors(): boolean {
    return !!this.error;
  }

  get isDirty(): boolean {
    return this.value !== this._initialValue;
  }

  get defaultText(): string {
    return this.schema.default !== undefined ? String(this.schema.default) : '';
  }

  submit(): void {
    this._initialValue = this.value;
  }

  reset(): void {
    this.value = this._initialValue;
    this._checkConstraints();
  }
}
