'use strict';

import { makeObservable, action, computed, observable } from 'mobx';
import { OptionsStore } from './optionsStore';

export class OneOfStore {
  constructor(name) {
    this.type = 'oneOf';
    this.optionsStore = new OptionsStore({
      name: name,
      value: null,
    });
    this.items = [];
    this.matchFns = [];

    // TODO: Make dirty on selected form change

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
    const index = this.matchFns.findIndex((fn, index) => {
      if (fn(value)) {
        this.optionsStore.setValue(index);
        return true;
      }
      return false;
    });
    if (index === -1) {
      this.optionsStore.setValue(null);
    }
  }

  get isDirty() {
    if (this.optionsStore.selectedOption === null) {
      return false;
    }
    return this.selectedForm.isDirty;
  }

  get hasErrors() {
    if (this.optionsStore.selectedOption === null) {
      return true;
    }
    return this.selectedForm.hasErrors;
  }

  get value() {
    return this.selectedForm?.value;
  }

  get selectedForm() {
    return this.items?.[this.optionsStore.selectedOption?.value];
  }

  submit() {
    this.selectedForm?.submit();
  }

  reset() {
    this.selectedForm?.reset();
  }
}