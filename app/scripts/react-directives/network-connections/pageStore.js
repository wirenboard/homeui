'use strict';

import Connections, { connectionsStoreFromJson, connectionsToJson } from './connectionsStore';
import SwitcherStore, { switcherStoreToJson, switcherStoreFromJson } from './switcherStore';
import ConfirmModalState from './confirmModalState';
import SelectNewConnectionModalState from './selectNewConnectionModalState';
import { makeAutoObservable, runInAction } from 'mobx';
import i18n from '../../i18n/react/config';

class NetworkConnectionsPageStore {
  constructor(onSave, onToggleConnectionState) {
    this.confirmModalState = new ConfirmModalState();
    this.selectNewConnectionModalState = new SelectNewConnectionModalState();
    this.connections = new Connections();
    this.switcher = new SwitcherStore(this.connections);
    this.onToggleConnectionState = onToggleConnectionState;
    this.onSave = onSave;
    this.selectedTabIndex = 0;
    this.loading = true;
    this.error = '';

    makeAutoObservable(this);
  }

  async showHasErrorsConfirmModal() {
    return this.confirmModalState.show(i18n.t('network-connections.labels.has-errors'), [
      {
        label: i18n.t('network-connections.buttons.dont-save'),
        type: 'danger',
        result: 'dont-save',
      },
    ]);
  }

  async showHasChangesConfirmModal() {
    return this.confirmModalState.show(i18n.t('network-connections.labels.changes'), [
      {
        label: i18n.t('network-connections.buttons.save'),
        type: 'success',
        result: 'save',
      },
      {
        label: i18n.t('network-connections.buttons.dont-save'),
        type: 'danger',
        result: 'dont-save',
      },
    ]);
  }

  async onSelect(index, lastIndex) {
    try {
      let activePageStore = lastIndex === 0 ? this.connections : this.switcher;
      if (activePageStore.hasErrors || activePageStore.isDirty) {
        const action = activePageStore.hasErrors
          ? await this.showHasErrorsConfirmModal()
          : await this.showHasChangesConfirmModal();
        if (action === 'cancel') {
          return false;
        }
        if (action === 'dont-save') {
          activePageStore.reset();
        }
        if (action === 'save') {
          await this.saveAll();
          activePageStore.submit();
        }
      }
      runInAction(() => {
        this.selectedTabIndex = index;
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  get isDirty() {
    return this.connections.isDirty || this.switcher.isDirty;
  }

  async showDeleteConnectionConfirmModal() {
    return this.confirmModalState.show(
      i18n.t('network-connections.labels.confirm-delete-connection'),
      [
        {
          label: i18n.t('network-connections.buttons.delete'),
          type: 'danger',
        },
      ]
    );
  }

  async beforeConnectionSwitch() {
    const activeConnection = this.connections.connections[this.connections.selectedConnectionIndex];
    if (!activeConnection?.isDirty) {
      return;
    }

    const action = activeConnection.hasErrors
      ? await this.showHasErrorsConfirmModal()
      : await this.showHasChangesConfirmModal();

    if (action === 'save') {
      await this.saveAll();
    } else {
      if (activeConnection.isNew) {
        this.connections.removeConnection(activeConnection);
      } else {
        activeConnection.reset();
      }
    }
  }

  async selectConnection(index) {
    if (index >= 0 && index < this.connections.connections.length) {
      await this.beforeConnectionSwitch();
      this.connections.setSelectedConnectionIndex(index);
    }
  }

  async createConnection() {
    await this.beforeConnectionSwitch();
    const connectionType = await this.selectNewConnectionModalState.show();
    this.connections.setSelectedConnectionIndex(
      this.connections.addConnection({ type: connectionType, state: 'new' })
    );
  }

  async deleteConnection(connection) {
    await this.showDeleteConnectionConfirmModal();
    if (!connection.isNew) {
      await this.save(this.connections.connections.filter(item => item !== connection));
    }
    this.connections.removeConnection(connection);
  }

  async save(connections) {
    this.setLoading(true);
    const jsonToSave = {
      ui: {
        connections: connectionsToJson(connections),
        con_switch: switcherStoreToJson(this.switcher),
      },
    };
    try {
      await this.onSave(jsonToSave);
      this.connections.submit();
      this.switcher.submit();
      this.setLoading(false);
    } catch (err) {
      this.setError(err.message);
      this.setLoading(false);
      throw err;
    }
  }

  setSchemaAndData(schema, data) {
    this.connections.setSchemaAndData(schema, data.data);
    connectionsStoreFromJson(this.connections, data);
    switcherStoreFromJson(this.switcher, data.ui.con_switch, this.connections);
    this.setError('');
    this.setLoading(false);
  }

  toggleConnectionState(connection) {
    if (connection.state === 'activated') {
      connection.setState('deactivating');
    } else {
      if (connection.state === 'not-connected') {
        connection.setState('activating');
      }
    }
    this.onToggleConnectionState(connection.data.connection_uuid);
  }

  async saveAll() {
    await this.save(this.connections.connections);
  }

  setConnectionState(connectionUuid, state) {
    this.connections.findConnection(connectionUuid)?.setState(state);
  }

  setConnectionConnectivity(connectionUuid, state) {
    this.connections.findConnection(connectionUuid)?.setConnectivity(state);
  }

  setError(msg) {
    this.error = msg;
  }

  setLoading(isLoading) {
    this.loading = isLoading;
  }
}

export default NetworkConnectionsPageStore;
