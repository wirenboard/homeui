'use strict';

import { makeAutoObservable } from 'mobx';

export class BooleanStore {
  constructor({ name, value }) {
    this.type = 'boolean';
    this.name = name;
    this.setValue(value);

    makeAutoObservable(this);
  }

  setValue(value) {
    this.value = !!value;
  }
}
