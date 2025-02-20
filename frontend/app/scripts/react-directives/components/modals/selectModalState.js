'use strict';

import { makeAutoObservable } from 'mobx';

class SelectModalState {
  id = 'selectModal';
  active = false;
  options = [];
  title = '';
  selectButtonLabel = '';
  onSelect = undefined;
  onCancel = undefined;

  constructor(id) {
    this.id = id ? id : this.id;
    makeAutoObservable(this);
  }

  show(title, selectButtonLabel, options) {
    return new Promise((resolve, reject) => {
      this.title = title;
      this.options = options;
      this.selectButtonLabel = selectButtonLabel;
      this.onSelect = type => {
        this.active = false;
        resolve(type);
      };
      this.onCancel = () => {
        this.active = false;
        reject('cancel');
      };
      this.active = true;
    });
  }
}

export default SelectModalState;
