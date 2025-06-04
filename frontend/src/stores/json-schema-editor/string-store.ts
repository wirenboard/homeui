import { makeObservable, observable, action, computed } from 'mobx';
import i18n from '~/i18n/react/config';
import MistypedValue from './mistyped-value';
import { getDefaultStringValue } from './schema-helpers';
import { StringSchema } from './types';

interface Option {
  label: string;
  value: string;
}

export default class StringStore {
  public value: MistypedValue | string | undefined;
  public schema: StringSchema;
  public error: string;
  public required: boolean;
  public enumOptions: Option[] = [];

  private _initialValue: MistypedValue | string | undefined;

  constructor(schema: StringSchema, initialValue: unknown, required: boolean) {
    if (typeof initialValue === 'string') {
      this.value = initialValue;
    } else if (initialValue === undefined) {
      this.value = schema.options?.wb?.show_editor ? getDefaultStringValue(schema) : undefined;
    } else {
      this.value = { type: typeof initialValue, value: String(initialValue) } as MistypedValue;
    }
    this._initialValue = this.value;
    this.schema = schema;
    this.required = required;

    if (this.schema.enum) {
      this.enumOptions = this.schema.enum.map((value, index) => ({
        label: this.schema.options?.enum_titles?.[index] ?? value,
        value: value,
      }));
    }

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
      this.error = i18n.t('json-editor.errors.not-a-string');
      return;
    }
    if (this.value === undefined) {
      this.error = this.required ? i18n.t('json-editor.errors.required') : '';
      return;
    }
    if (this.schema.enum && !this.schema.enum.includes(this.value)) {
      this.error = i18n.t('json-editor.errors.not-in-enum');
      return;
    }
    if (this.schema.pattern) {
      const regExp = new RegExp(this.schema.pattern);
      if (!regExp.test(this.value)) {
        this.error = this.schema.options?.patternmessage ?? i18n.t('json-editor.errors.invalid-format');
        return;
      }
    }
    if (this.schema.maxLength !== undefined && this.value.length > this.schema.maxLength) {
      this.error = i18n.t('json-editor.errors.max-length', { limit: this.schema.maxLength });
      return;
    }
    if (this.schema.minLength !== undefined && this.value.length < this.schema.minLength) {
      this.error = i18n.t('json-editor.errors.min-length', { limit: this.schema.minLength });
      return;
    }
    this.error = '';
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
