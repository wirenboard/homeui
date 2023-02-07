import {
  action, observable, makeObservable, runInAction, computed,
} from 'mobx';
import i18n from '../../i18n/react/config';
import {
  Connection,
  makeConnectionSchema,
  getConnectionJson,
} from './connectionStore';
import ConfirmModalState from './confirmModalState';
import SelectNewConnectionModalState from './selectNewConnectionModalState';

function stableSort(arr, compare) {
  return arr
    .map((item, index) => ({ item, index }))
    .sort((a, b) => compare(a.item, b.item) || a.index - b.index)
    .map(({ item }) => item);
}

function typeCompare(cn1, cn2) {
  if (cn1.data.type > cn2.data.type) {
    return 1;
  }
  if (cn1.data.type < cn2.data.type) {
    return -1;
  }
  return 0;
}

class ConnectionsStore {
  connections = [];

  newConnection = undefined;

  confirmModalState = new ConfirmModalState();

  selectNewConnectionModalState = new SelectNewConnectionModalState();

  error = '';

  _schema = {};

  _additionalData = {};

  _toggleConnectionState = undefined;

  constructor(connections) {
    this.connections = connections;

    makeObservable(this, {
      connections: observable,
      deprecatedConnections: computed,
      sortedConnections: computed,
      setSelected: action,
      saveConnections: action,
      addConnection: action,
      deleteConnection: action,
    });
  }

  get deprecatedConnections() {
    return this.connections.filter((cn) => cn.isDeprecated).map((cn) => cn.name);
  }

  get sortedConnections() {
    const connections = this.connections.slice();
    if (this.newConnection) {
      connections.push(this.newConnection);
    }
    return stableSort(this.connections, typeCompare);
  }

  beforeConnectionSwitch(activeConnection) {
    return new Promise(async (resolve, reject) => {
      if (!activeConnection.isChanged) {
        resolve();
        return;
      }

      let title;
      const buttons = [
        {
          label: i18n.t('network-connections.buttons.dont-save'),
          type: 'danger',
          result: 'dont-save',
        },
      ];

      if (activeConnection.hasErrors) {
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
            if (activeConnection === this.newConnection) {
              this.newConnection = null;
            } else {
              activeConnection.rollback();
            }
          });
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async setSelected(connectionToActivate, activeConnection) {
    if (!connectionToActivate.active) {
      try {
        await this.beforeConnectionSwitch(activeConnection);
      } catch (err) {
        if (err !== 'cancel') {
          throw err;
        }
      }
    }
  }

  async saveConnections(saveFunction) {
    const connections = this.connections.slice();
    if (this.newConnection) {
      connections.push(this.newConnection);
    }
    const jsonToSave = connections.map((cn) => getConnectionJson(cn.editedData));

    await saveFunction(jsonToSave);
    runInAction(() => {
      connections.forEach((cn) => cn.commit());
    });
  }

  _findIndex(pattern) {
    let index = 1;
    const re = new RegExp(pattern);
    this.connections.forEach((cn) => {
      if (cn.data.connection_id) {
        const match = cn.data.connection_id.match(re);
        if (match) {
          const next = parseInt(match[1]) + 1;
          index = next > index ? next : index;
        }
      }
    });
    return index;
  }

  _getNewConnection(type) {
    const connection_id = '';
    if (type === 'can') {
      return {
        type, 'allow-hotplug': true, auto: false, options: { bitrate: 125000 },
      };
    }
    if (type === '01_nm_ethernet') {
      return {
        type,
        connection_uuid: '',
        connection_id: `Wired connection ${this._findIndex('Wired connection (\\d+)')}`,
      };
    }
    if (type === '02_nm_modem') {
      return {
        type,
        connection_uuid: '',
        connection_id: `gsm ${this._findIndex('gsm (\\d+)')}`,
      };
    }
    return { type, connection_uuid: '', connection_id };
  }

  addConnection({ type, connectionData, state }) {
    connectionData = connectionData || this._getNewConnection(type);
    connectionData.data = this._additionalData;

    const connection = new Connection(
      makeConnectionSchema(type, this._schema),
      connectionData,
      state,
    );

    this.newConnection = connection;
  }

  async createConnection(activeConnection) {
    try {
      await this.beforeConnectionSwitch(activeConnection);
      const connectionType = await this.selectNewConnectionModalState.show();
      this.addConnection({ type: connectionType, state: 'new' });
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
        buttons,
      );
      if (connection !== this.newConnection) {
        await this.saveConnections(this.connections.filter((cn) => cn !== connection));
      }
      runInAction(() => {
        this.newConnection = null;
      });
    } catch (err) {
      if (err !== 'cancel') {
        throw err;
      }
    }
  }
}

export default ConnectionsStore;
