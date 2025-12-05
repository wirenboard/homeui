import { action, makeObservable, observable, computed } from 'mobx';
import i18n from '../../i18n/react/config';

export class NumberStore {
  constructor({ type, name, description, placeholder, min, max, value, defaultText, strict }) {
    this.type = type || 'number';
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

  setValue(value) {
    if (value === undefined) {
      this.value = undefined;
    } else {
      const convertedValue = this.type === 'integer' ? parseInt(value) : parseFloat(value);
      this.value = isNaN(convertedValue) ? value : convertedValue;
    }
  }

  setFormColumns(columns) {
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

  setCustomError(error) {
    this.customError = error;
  }

  setStrict(strict) {
    this.strict = strict;
  }

  setDefaultText(defaultText) {
    this.defaultText = defaultText;
  }
}
