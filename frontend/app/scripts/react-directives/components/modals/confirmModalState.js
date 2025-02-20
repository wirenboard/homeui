'use strict';

import { makeAutoObservable } from 'mobx';

class ConfirmModalState {
  id = 'confirmModal';
  text = '';
  buttons = [];
  active = false;
  onCancel = undefined;

  constructor(id) {
    this.id = id ? id : this.id;
    makeAutoObservable(this);
  }

  show(text, buttons) {
    return new Promise((resolve, reject) => {
      this.text = text;
      this.buttons = buttons?.map(bt => {
        return {
          label: bt.label,
          type: bt.type,
          onClick: () => {
            this.active = false;
            resolve(bt.result || 'ok');
          },
        };
      });
      this.onCancel = () => {
        this.active = false;
        resolve('cancel');
      };
      this.active = true;
    });
  }
}

export default ConfirmModalState;
