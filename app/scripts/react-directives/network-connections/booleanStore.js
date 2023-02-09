'use strict';

import { makeAutoObservable } from 'mobx';

export class BooleanStore {
  constructor({ name, value, id }) {
    this.name = name;
    this.id = id;
    this.setValue(value);

    makeAutoObservable(this);
  }

  setValue(value) {
    this.value = !!value;
  }
}
