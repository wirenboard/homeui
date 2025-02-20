'use strict';

import { makeObservable, action, computed, observable } from 'mobx';

export class ArrayStore {
  constructor(name, headers, makeItemFormFn) {
    this.type = 'array';
    this.name = name;
    this.headers = headers;
    this.items = [];
    this.makeItemFormFn = makeItemFormFn;
    this.contentIsChanged = false;

    makeObservable(this, {
      items: observable,
      contentIsChanged: observable,
      add: action,
      remove: action,
      setValue: action,
      isDirty: computed,
      hasErrors: computed,
      value: computed,
    });
  }

  add() {
    this.items.push(this.makeItemFormFn());
    this.contentIsChanged = true;
  }

  remove(index) {
    this.items.splice(index, 1);
    this.contentIsChanged = true;
  }

  setValue(value) {
    this.items.replace(
      value.map(v => {
        let form = this.makeItemFormFn();
        form.setValue(v);
        return form;
      })
    );
    this.contentIsChanged = false;
  }

  get isDirty() {
    return this.contentIsChanged || this.items.some(v => v.isDirty);
  }

  get hasErrors() {
    return this.items.some(v => v.hasErrors);
  }

  get value() {
    return this.items.map(v => v.value);
  }

  submit() {
    this.contentIsChanged = false;
    this.items.forEach(v => v.submit());
  }

  reset() {
    this.contentIsChanged = false;
    this.items.forEach(v => v.reset());
  }
}
