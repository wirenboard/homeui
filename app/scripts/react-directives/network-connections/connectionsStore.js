'use strict';

import { action, observable, makeObservable, runInAction } from 'mobx';
import i18n from '../../i18n/react/config';
import {
  Connection,
  makeConnectionSchema,
  getNewConnection,
  getConnectionJson,
} from './connectionStore';
import ConfirmModalState from './confirmModalState';
import SelectNewConnectionModalState from './selectNewConnectionModalState';

function stableSort (arr, compare) {
  return arr.map((item, index) => ({item, index}))
            .sort((a, b) => compare(a.item, b.item) || a.index - b.index)
            .map(({item}) => item)
}

function typeCompare(cn1 , cn2) {
  if (cn1.data.type > cn2.data.type) {
    return 1;
  }
  if (cn1.data.type < cn2.data.type) {
    return -1;
  }
  return 0;
}

class Connections {
  connections = [];
  confirmModalState = new ConfirmModalState();
  selectNewConnectionModalState = new SelectNewConnectionModalState();
  onSave = undefined;
  loading = true;
  isChanged = false;
  error = '';
  _activeConnection = undefined;
  _newConnectionIndex = 0;
  _schema = {};
  _additionalData = {};

  constructor(onSave) {
    this.onSave = onSave;
    makeObservable(this, {
      connections: observable,
      loading: observable,
      isChanged: observable,
      setSchemaAndData: action,
      setSelected: action,
      saveConnections: action,
      addConnection: action,
      activateConnection: action,
      deleteConnection: action,
    });
  }

  setSchemaAndData(schema, data) {
    this._schema = schema;
    this._additionalData = data.data;
    this.connections = [];
    data.ui.connections.forEach(cn => this.addConnection({ type: cn.type, connectionData: cn }));
    this.connections = stableSort(this.connections, typeCompare);
    if (this.connections.length) {
      this.activateConnection(this.connections[0]);
    }
    this.error = '';
    this.loading = false;
  }

  activateConnection(connectionToActivate) {
    this._activeConnection?.deactivate();
    this._activeConnection = connectionToActivate;
    connectionToActivate.activate();
  }

  beforeConnectionSwitch() {
    return new Promise(async (resolve, reject) => {
      if (!this._activeConnection?.isChanged) {
        resolve();
        return;
      }

      var title;
      var buttons = [
        {
          label: i18n.t('network-connections.buttons.dont-save'),
          type: 'danger',
          result: 'dont-save',
        },
      ];

      if (this._activeConnection.hasErrors) {
        title = i18n.t('network-connections.labels.has-errors');
      } else {
        title = i18n.t('network-connections.labels.changes');
        buttons.unshift({
          label: i18n.t('network-connections.buttons.save'),
          type: 'success',
          result: 'save',
        });
      }

      try {
        if ((await this.confirmModalState.show(title, buttons)) === 'save') {
          await this.saveConnections(this.connections);
        } else {
          runInAction(() => {
            if (this._activeConnection.isNew) {
              this.connections.remove(this._activeConnection);
              this._activeConnection = undefined;
            } else {
              this._activeConnection.rollback();
            }
          });
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async setSelected(connectionToActivate) {
    if (!connectionToActivate.active) {
      try {
        await this.beforeConnectionSwitch();
        this.activateConnection(connectionToActivate);
      } catch (err) {
        if (err !== 'cancel') {
          throw err;
        }
      }
    }
  }

  async saveConnections(connections) {
    this.loading = true;
    const jsonToSave = {
      ui: {
        connections: connections.map(cn => getConnectionJson(cn.editedData)),
        con_switch: {},
      },
    };
    try {
      await this.onSave(jsonToSave);
      runInAction(() => {
        connections.forEach(cn => cn.commit());
        this.isChanged = false;
        this.loading = false;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err.message;
        this.loading = false;
      });
      throw err;
    }
  }

  addConnection({ type, connectionData, state }) {
    connectionData = connectionData ? connectionData : getNewConnection(type);
    connectionData.data = this._additionalData;

    var connection = new Connection(
      makeConnectionSchema(type, this._schema),
      connectionData,
      this._newConnectionIndex,
      state
    );
    this.connections.push(connection);
    this._newConnectionIndex++;
    return connection;
  }

  async createConnection() {
    try {
      await this.beforeConnectionSwitch();
      if (this._activeConnection === undefined && this.connections.length) {
        this.activateConnection(this.connections[0]);
      }
      const connectionType = await this.selectNewConnectionModalState.show();
      const cn = this.addConnection({ type: connectionType, state: 'new' });
      runInAction(() => {
        this.connections = stableSort(this.connections, typeCompare);
      })
      this.setSelected(cn);
    } catch (err) {
      if (err !== 'cancel') {
        throw err;
      }
    }
  }

  async deleteConnection(connection) {
    const buttons = [
      {
        label: i18n.t('network-connections.buttons.delete'),
        type: 'danger',
      },
    ];

    try {
      await this.confirmModalState.show(
        i18n.t('network-connections.labels.confirm-delete-connection'),
        buttons
      );
      if (!connection.isNew) {
        await this.saveConnections(this.connections.filter(cn => cn !== connection));
      }
      runInAction(() => {
        this.connections.remove(connection);
        if (connection === this._activeConnection) {
          this._activeConnection = undefined;
        }
      });
      if (this.connections.length) {
        this.activateConnection(this.connections[0]);
      }
    } catch (err) {
      if (err !== 'cancel') {
        throw err;
      }
    }
  }
}

export default Connections;
