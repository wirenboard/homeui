'use strict';

import { makeObservable, action, computed, observable } from 'mobx';
import { OptionsStore } from './optionsStore';

export class OneOfStore {
  constructor(name) {
    this.type = 'oneOf';
    this.optionsStore = new OptionsStore({
      name: name,
      value: null,
      strict: true,
    });
    this.items = [];
    this.matchFns = [];

    makeObservable(this, {
      items: observable,
      add: action,
      setValue: action,
      isDirty: computed,
      hasErrors: computed,
      value: computed,
      selectedForm: computed,
    });
  }

  add(store, matchFn) {
    this.items.push(store);
    this.matchFns.push(matchFn);
    this.optionsStore.addOption({
      value: this.items.length - 1,
      label: store.name,
    });
  }

  setValue(value) {
    const index = this.matchFns.findIndex(fn => fn(value));
    if (index === -1) {
      this.optionsStore.setValue(null);
    } else {
      this.items[index].setValue(value);
      this.optionsStore.setValue(index);
    }
  }

  get isDirty() {
    if (this.optionsStore.selectedOption === null) {
      return false;
    }
    return this.selectedForm?.isDirty || this.optionsStore.isDirty;
  }

  get hasErrors() {
    if (this.optionsStore.selectedOption === null) {
      return true;
    }
    return this.selectedForm?.hasErrors || this.optionsStore.hasErrors;
  }

  get value() {
    return this.selectedForm?.value;
  }

  get selectedForm() {
    return this.items?.[this.optionsStore.selectedOption?.value];
  }

  submit() {
    this.selectedForm?.submit();
    this.optionsStore.submit();
  }

  reset() {
    this.optionsStore.reset();
    this.selectedForm?.reset();
  }
}
