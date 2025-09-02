import { makeObservable, observable, action, computed } from 'mobx';

export class StringStore {
  constructor({
    name,
    description,
    value,
    placeholder,
    validator,
    defaultText,
    readOnly,
    editType = 'text',
    required,
    autocomplete,
  }) {
    this.type = 'string';
    this.name = name;
    this.description = description;
    this.validator = validator;
    this.placeholder = placeholder;
    this.defaultText = defaultText;
    this.formColumns = null;
    this.error = '';
    this.readOnly = readOnly;
    this.setValue(value);
    this.initialValue = this.value;
    this.editType = editType;
    this.required = required;
    this.autocomplete = autocomplete;

    makeObservable(this, {
      value: observable,
      formColumns: observable,
      readOnly: observable,
      setValue: action,
      setFormColumns: action,
      error: observable,
      hasErrors: computed,
      isDirty: computed,
      submit: action,
      reset: action,
      setReadOnly: action,
    });
  }

  setValue(value) {
    const type = typeof value;
    if (type === 'string') {
      this.value = value;
    } else if (type === 'number') {
      this.value = String(value);
    } else {
      this.value = '';
    }
    this.error = this.validator?.(this.value) ?? '';
  }

  setPlaceholder(placeholder) {
    this.placeholder = placeholder;
  }

  setDefaultText(text) {
    this.defaultText = text;
  }

  setFormColumns(columns) {
    this.formColumns = columns;
  }

  get hasErrors() {
    return !!this.error;
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

  setReadOnly(readOnly) {
    this.readOnly = readOnly;
  }
}
