'use strict';

import { makeAutoObservable } from 'mobx';

class SimpleModalState {
  id = 'modal';
  active = false;
  text = '';
  okText = '';
  onOk = undefined;
  onCancel = undefined;

  constructor(id) {
    this.id = id ? id : this.id;
    makeAutoObservable(this);
  }

  show(text, okText) {
    this.text = text;
    this.okText = okText;
    return new Promise((resolve, _reject) => {
      this.onOk = () => {
        this.active = false;
        resolve(true);
      };
      this.onCancel = () => {
        this.active = false;
        resolve(false);
      };
      this.active = true;
    });
  }
}

export default SimpleModalState;
