'use strict';

import { makeObservable, observable, action } from 'mobx';

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
    this.setValue(value);

    makeObservable(this, {
      options: observable,
      value: observable,
      hasErrors: observable,
      selectedOption: observable,
      setValue: action,
      setSelectedOption: action,
      setOptions: action,
    });
  }

  setValue(value) {
    this.value = value;
    this.options.some(item => {
      if ('options' in item) {
        this.selectedOption = item.options.find(option => option.value == value);
        return !!this.selectedOption;
      }
      if (item.value == value) {
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

  setSelectedOption(option) {
    this.selectedOption = option;
    this.setValue(option ? option.value : null);
  }
}
