'use strict';

import {makeObservable, action, observable, runInAction} from 'mobx';
import Connections from './connectionsStore';

class Switcher {
  isActiveEditor = false;

  constructor(onSave) {
    this.onSave = onSave;
    makeObservable(this, {
      activateEditor: action,
      deactivateEditor: action,
      isActiveEditor: observable,
    })
  }

  async activateEditor() {
    runInAction(() => {
      this.isActiveEditor = true;
    });
  }

  async deactivateEditor() {
    runInAction(() => {
      this.isActiveEditor = false;
    });
  }
}

class NetworksEditor {
  _connections = undefined;
  _switcher = undefined;

  _activeEditor = undefined;

  constructor(onSave, toggleConnectionState) {
    this._connections = new Connections(onSave, toggleConnectionState);
    this._switcher = new Switcher(onSave);

    this._activeEditor = this._connections;
    this._connections.activateEditor();
  }

  get connections() {
    return this._connections;
  }

  get switcher() {
    return this._switcher;
  }

  async selectEditor(editor) {
    await this._activeEditor?.deactivateEditor();
    this._activeEditor = editor;
    await editor.activateEditor();
  }
}

export default NetworksEditor;
