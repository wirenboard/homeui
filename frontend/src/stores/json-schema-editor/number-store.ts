import { action, makeObservable, observable, computed } from 'mobx';
import i18n from '~/i18n/react/config';
import { getDefaultNumberValue } from './schema-helpers';
import { NumberSchema } from './types';

type Option = {
  label: string;
  value: number;
};

export default class NumberStore {
  public value: any;
  public schema: NumberSchema;
  public error: string;
  public required: boolean;
  public enumOptions: Option[] = [];

  private _initialValue: any;

  constructor(schema: NumberSchema, initialValue: any, required: boolean) {
    if (initialValue === undefined && schema.options?.wb?.show_editor) {
      this.value = getDefaultNumberValue(schema);
    } else {
      this.value = initialValue;
    }
    this._initialValue = this.value;
    this.schema = schema;
    this.required = required;

    if (this.schema.enum) {
      this.enumOptions = this.schema.enum.map((value, index) => ({
        label: this.schema.options?.enum_titles?.[index] || String(value),
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
    if (typeof this.value !== 'number' && this.value !== undefined) {
      this.error = i18n.t('json-editor.errors.not-a-number');
      return;
    }
    if (this.required && this.value === undefined) {
      this.error = i18n.t('json-editor.errors.required');
      return;
    }
    if (this.schema.enum && !this.schema.enum.includes(this.value)) {
      this.error = i18n.t('json-editor.errors.not-in-enum');
      return;
    }
    if (this.schema.type === 'integer' && !Number.isSafeInteger(this.value)) {
      this.error = i18n.t('json-editor.errors.not-an-integer');
      return;
    }
    if (
      (this.schema.minimum !== undefined && this.schema.minimum > this.value) ||
      (this.schema.maximum !== undefined && this.schema.maximum < this.value)
    ) {
      let context = this.schema.minimum !== undefined ? 'min' : '';
      context += this.schema.maximum !== undefined ? 'max' : '';
      this.error = i18n.t('json-editor.errors.' + context, {
        context: context,
        min: this.schema.minimum,
        max: this.schema.maximum,
      });
      return;
    }
    this.error = '';
  }

  setValue(value: number | string): void {
    this.value = value;
    if (typeof this.value === 'string') {
      const parsedValue = parseFloat(this.value);
      if (!isNaN(parsedValue)) {
        this.value = parsedValue;
      }
    }
    this._checkConstraints();
  }

  setUndefined(): void {
    this.value = undefined;
    this._checkConstraints();
  }

  setDefault(): void {
    this.setValue(getDefaultNumberValue(this.schema));
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
    this.setValue(this._initialValue);
  }
}
