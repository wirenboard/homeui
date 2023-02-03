'use strict';

import {makeObservable, action, observable, runInAction} from 'mobx';
import Connections from './connectionsStore';

export class SwitcherConnection {
  name = ""
  key = ""
  constructor(name) {
    this.name = name;
    this.key = name;
  }
};

export class Switcher {
  isActiveEditor = false;
  
  // FIXME
  connectionsHigh = [new SwitcherConnection("high1"), new SwitcherConnection("high2")];
  connectionsMed = [new SwitcherConnection("med1"), new SwitcherConnection("med2"), new SwitcherConnection("med3")];
  connectionsLow = [new SwitcherConnection("low1"), new SwitcherConnection("low2")];

  constructor(onSave) {
    this.onSave = onSave;
    
    makeObservable(this, {
      activateEditor: action,
      deactivateEditor: action,
      isActiveEditor: observable,

      connectionsHigh: observable,
      connectionsMed: observable,
      connectionsLow: observable,
      moveConnection: action,
    });
  }

  moveConnection(con, from, to) {
    const currentPos = from.indexOf(con);
    from.splice(currentPos, 1);
    to.splice(currentPos, 0, con);
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

export class NetworksEditor {
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
