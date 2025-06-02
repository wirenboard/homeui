import { observable, action, computed, makeObservable } from 'mobx';
import i18n from '~/i18n/react/config';
import { getDefaultBooleanValue } from './schema-helpers';
import { BooleanSchema } from './types';

export default class BooleanStore {
  public value: any;
  public schema: BooleanSchema;
  public error: string = '';
  public required: boolean;

  private _initialValue: any;

  constructor(schema: BooleanSchema, initialValue: any, required: boolean) {
    if (initialValue === undefined && schema.options?.wb?.show_editor) {
      this.value = getDefaultBooleanValue(schema);
    } else {
      this.value = initialValue;
    }
    this.schema = schema;
    this._initialValue = this.value;
    this.required = required;

    this._checkConstraints();

    makeObservable(this, {
      value: observable,
      error: observable,
      setValue: action,
      setUndefined: action,
      _checkConstraints: action,
      isDirty: computed,
      submit: action,
      reset: action,
    });
  }

  _checkConstraints(): void {
    if (typeof this.value !== 'boolean' && this.value !== undefined) {
      this.error = i18n.t('json-editor.errors.not-a-boolean');
      return;
    }
    if (this.required && this.value === undefined) {
      this.error = i18n.t('json-editor.errors.required');
      return;
    }
    this.error = '';
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

  get defaultText(): string {
    return '';
  }

  submit(): void {
    this._initialValue = this.value;
  }

  reset(): void {
    this.setValue(this._initialValue);
  }
}
