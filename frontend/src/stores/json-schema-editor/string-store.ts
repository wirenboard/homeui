import { makeObservable, observable, action, computed } from 'mobx';
import type { Option } from '@/components/dropdown';
import { MistypedValue } from './mistyped-value';
import { getDefaultStringValue } from './schema-helpers';
import type { JsonSchema, ValidationError, PropertyStore } from './types';

export class StringStore implements PropertyStore {
  public value: MistypedValue | string | undefined;
  public schema: JsonSchema;
  public isDirty: boolean = false;
  public error: ValidationError | undefined;
  public enumOptions: Option<string>[] = [];

  readonly storeType = 'string';
  readonly required: boolean;

  private _initialValue: MistypedValue | string | undefined;

  constructor(schema: JsonSchema, initialValue: unknown, required: boolean) {
    if (typeof initialValue === 'string') {
      this.value = initialValue;
    } else if (initialValue === undefined) {
      if (schema.options?.wb?.show_editor && !schema.options?.wb?.allow_undefined) {
        this.value = getDefaultStringValue(schema);
      } else {
        this.value = undefined;
      }
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
      isDirty: observable,
      setValue: action,
      setUndefined: action,
      _checkConstraints: action,
      hasErrors: computed,
      commit: action,
      reset: action,
    });
  }

  _checkConstraints(): void {
    if (this.value instanceof MistypedValue) {
      this.error = { key: 'json-editor.errors.not-a-string' };
      return;
    }
    if (this.value === undefined) {
      const forbidUndefined = (this.schema.options?.wb?.show_editor && !this.schema.options?.wb?.allow_undefined)
        || this.required
        || this.schema.options?.show_opt_in;
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
    this.isDirty = this.value !== this._initialValue;
    this._checkConstraints();
  }

  setUndefined(): void {
    this.value = undefined;
    this.isDirty = this.value !== this._initialValue;
    this._checkConstraints();
  }

  setDefault(): void {
    if (!this.required && this.schema.options?.wb?.show_editor && this.schema.options?.wb?.allow_undefined) {
      this.setUndefined();
      return;
    }
    this.setValue(getDefaultStringValue(this.schema));
  }

  get hasErrors(): boolean {
    return !!this.error;
  }

  get defaultText(): string {
    return this.schema.default !== undefined ? String(this.schema.default) : '';
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
