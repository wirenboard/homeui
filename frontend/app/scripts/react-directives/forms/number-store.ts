import { action, makeObservable, observable, computed } from 'mobx';
import i18n from '~/i18n/react/config';

export class NumberStore {
  public type?: string = 'number';
  public name?: string;
  public description?: string;
  public placeholder?: string;
  public defaultText?: string;
  public formColumns?: number = null;
  public customError?: string | boolean = '';
  public value?: number;
  public initialValue?: number;
  public min?: number;
  public max?: number;
  public strict?: boolean;

  constructor({
    type = 'number',
    name,
    description,
    placeholder,
    min,
    max,
    value,
    defaultText,
    strict,
  }: Partial<NumberStore>) {
    this.type = type;
    this.name = name;
    this.description = description;
    this.placeholder = placeholder;
    this.value = value;
    this.min = min;
    this.max = max;
    this.defaultText = defaultText;
    this.strict = !!strict;
    this.formColumns = null;
    this.initialValue = this.value;
    this.customError = '';

    makeObservable(this, {
      value: observable,
      initialValue: observable,
      formColumns: observable,
      defaultText: observable,
      setValue: action,
      setFormColumns: action,
      error: computed,
      hasErrors: computed,
      isDirty: computed,
      submit: action,
      reset: action,
      setCustomError: action,
      setStrict: action,
      setDefaultText: action,
    });
  }

  setValue(value: any) {
    if (value === undefined) {
      this.value = undefined;
    } else {
      const convertedValue = this.type === 'integer' ? parseInt(value) : parseFloat(value);
      this.value = isNaN(convertedValue) ? value : convertedValue;
    }
  }

  setFormColumns(columns: number) {
    this.formColumns = columns;
  }

  get error() {
    if (!this.hasErrors) {
      return '';
    }
    if (this.customError) {
      return this.customError;
    }
    const context = (this.min !== undefined ? 'min' : '') + (this.max !== undefined ? 'max' : '');
    return i18n.t('editors.errors.' + this.type, {
      context: context,
      min: this.min,
      max: this.max,
    });
  }

  get hasErrors() {
    if (this.customError) {
      return true;
    }
    // @ts-ignore
    if ((!this.strict && this.value !== undefined && this.value !== '') || this.strict) {
      return (
        (this.type === 'integer' && !Number.isInteger(this.value)) ||
        (this.type === 'number' && typeof this.value !== 'number') ||
        (this.min !== undefined && this.min > this.value) ||
        (this.max !== undefined && this.max < this.value)
      );
    }
    return false;
  }

  get isDirty() {
    return this.value !== this.initialValue;
  }

  submit() {
    this.initialValue = this.value;
  }

  reset() {
    this.setValue(this.initialValue);
  }

  setCustomError(error: string) {
    this.customError = error;
  }

  setStrict(strict: boolean) {
    this.strict = strict;
  }

  setDefaultText(defaultText: string) {
    this.defaultText = defaultText;
  }
}
