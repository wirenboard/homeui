import { makeObservable, observable, action, computed } from 'mobx';
import i18n from '~/i18n/react/config';
import { getDefaultStringValue } from './schema-helpers';
import { StringSchema } from './types';

interface Option {
  label: string;
  value: string;
}

export default class StringStore {
  public value: any;
  public schema: StringSchema;
  public error: string;
  public required: boolean;
  public enumOptions: Option[] = [];

  private _initialValue: any;

  constructor(schema: StringSchema, initialValue: any, required: boolean) {
    if (initialValue === undefined && schema.options?.wb?.show_editor) {
      this.value = getDefaultStringValue(schema);
    } else {
      this.value = initialValue;
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
    if (typeof this.value !== 'string' && this.value !== undefined) {
      this.error = i18n.t('json-editor.errors.not-a-string');
      return;
    }
    if (this.schema.enum && !this.schema.enum.includes(this.value)) {
      this.error = i18n.t('json-editor.errors.not-in-enum');
      return;
    }
    if (this.required && this.value === undefined) {
      this.error = i18n.t('json-editor.errors.required');
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
