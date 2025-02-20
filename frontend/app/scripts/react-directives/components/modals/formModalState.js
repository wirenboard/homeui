'use strict';

import { makeAutoObservable } from 'mobx';

class FormModalState {
  id = 'formModal';
  active = false;
  formStore = {};
  title = '';
  okButtonLabel = '';
  onOk = () => {};
  onCancel = () => {};

  constructor(id) {
    this.id = id ? id : this.id;
    makeAutoObservable(this);
  }

  show(title, formStore, okButtonLabel) {
    this.title = title;
    this.formStore = formStore;
    this.okButtonLabel = okButtonLabel;
    return new Promise((resolve, reject) => {
      this.onOk = () => {
        this.active = false;
        resolve(this.formStore.value);
      };
      this.onCancel = () => {
        this.active = false;
        resolve(undefined);
      };
      this.active = true;
    });
  }
}

export default FormModalState;
