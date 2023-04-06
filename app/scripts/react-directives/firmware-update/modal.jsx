import { makeAutoObservable } from 'mobx';
import React from 'react';

class DownloadBackupModalState {
  id = 'downloadBackupModal';
  title = '';
  text = '';
  buttons = [];
  active = false;
  onCancel = undefined;

  constructor(id) {
    this.id = id ? id : this.id;
    makeAutoObservable(this);
  }

  show({title, text, buttons}) {
    return new Promise((resolve, reject) => {
      this.title = title;
      this.text = <div dangerouslySetInnerHTML={{ __html: text }} />;
      this.buttons = buttons;
      this.onCancel = () => {
        this.active = false;
      };
      this.active = true;
    });
  }

  hide() {
    this.active = false;
  }
}

export default DownloadBackupModalState;
