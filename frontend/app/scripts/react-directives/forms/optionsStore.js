import { makeObservable, observable, action } from 'mobx';

export function getFirstOptionValue(options) {
  return options?.[0]?.options ? options[0].options?.[0]?.value : options?.[0]?.value;
}

export class OptionsStore {
  constructor({ name, description, value, placeholder, options, strict }) {
    this.type = 'options';
    this.name = name;
    this.description = description;
    this.placeholder = placeholder;
    this.options = options || [];
    this.hasErrors = false;
    this.strict = strict ?? true;
    this.value = null;
    this.selectedOption = null;
    this.formColumns = null;
    this.initialValue = value;
    this.readOnly = false;
    this.setValue(value);

    makeObservable(this, {
      options: observable,
      value: observable,
      initialValue: observable,
      hasErrors: observable,
      selectedOption: observable,
      formColumns: observable,
      setValue: action,
      setSelectedOption: action,
      setOptions: action,
      setFormColumns: action,
      addOption: action,
    });
  }

  setValue(value) {
    this.value = value;
    this.options.some((item) => {
      if ('options' in item) {
        this.selectedOption = item.options.find((option) => option.value === value);
        return !!this.selectedOption;
      }
      if (item.value === value) {
        this.selectedOption = item;
        return true;
      }
      return false;
    });
    if (this.strict) {
      this.hasErrors = !this.selectedOption;
    } else {
      this.hasErrors = false;
    }
  }

  setOptions(options) {
    this.options = options;
    this.setValue(this.value);
  }

  addOption(option) {
    this.options.push(option);
  }

  setSelectedOption(option) {
    this.selectedOption = option;
    this.setValue(option ? option.value : null);
  }

  setFormColumns(columns) {
    this.formColumns = columns;
  }

  setReadOnly(value) {
    this.readOnly = value;
  }

  get isDirty() {
    return this.value !== this.initialValue;
  }

  submit() {
    this.initialValue = this.value;
  }

  reset() {
    this.setValue(this.initialValue);
    this.setReadOnly(false);
  }
}
