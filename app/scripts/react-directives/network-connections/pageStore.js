'use strict';

import Connections, { connectionsStoreFromJson, connectionsToJson } from './connectionsStore';
import SwitcherStore, { switcherStoreToJson, switcherStoreFromJson } from './switcherStore';
import ConfirmModalState from '../components/modals/confirmModalState';
import { makeAutoObservable, runInAction } from 'mobx';
import i18n from '../../i18n/react/config';
import SelectModalState from '../components/modals/selectModalState';

const CONFED_WRITE_FILE_ERROR = 1002;

class NetworkConnectionsPageStore {
  constructor(saveConnectionsFn, loadConnectionsFn, onToggleConnectionState) {
    this.confirmModalState = new ConfirmModalState();
    this.selectNewConnectionModalState = new SelectModalState('selectNewConnectionModal');
    this.connections = new Connections();
    this.switcher = new SwitcherStore(this.connections);
    this.onToggleConnectionState = onToggleConnectionState;
    this.saveConnections = saveConnectionsFn;
    this.loadConnections = loadConnectionsFn;
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
          if (!(await this.saveAll())) {
            return false;
          }
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

  async allowConnectionSwitch() {
    const activeConnection = this.connections.connections[this.connections.selectedConnectionIndex];
    if (!activeConnection?.isDirty) {
      return true;
    }

    const action = activeConnection.hasErrors
      ? await this.showHasErrorsConfirmModal()
      : await this.showHasChangesConfirmModal();

    if (action === 'save') {
      return await this.saveAll();
    }
    if (activeConnection.isNew) {
      this.connections.removeConnection(activeConnection);
    } else {
      activeConnection.reset();
    }
    return true;
  }

  async selectConnection(index) {
    if (
      index >= 0 &&
      index < this.connections.connections.length &&
      (await this.allowConnectionSwitch())
    ) {
      this.connections.setSelectedConnectionIndex(index);
    }
  }

  async createConnection() {
    if (await this.allowConnectionSwitch()) {
      let connectionType;
      try {
        connectionType = await this.selectNewConnectionModalState.show(
          i18n.t('network-connections.labels.select-type'),
          i18n.t('network-connections.buttons.add'),
          [
            { label: i18n.t('network-connections.labels.ethernet'), value: '01_nm_ethernet' },
            { label: i18n.t('network-connections.labels.wifi'), value: '03_nm_wifi' },
            { label: i18n.t('network-connections.labels.modem'), value: '02_nm_modem' },
            { label: i18n.t('network-connections.labels.canbus'), value: 'can' },
            { label: i18n.t('network-connections.labels.wifi-ap'), value: '04_nm_wifi_ap' },
          ]
        );
      } catch (err) {
        if (err == 'cancel') {
          return;
        }
      }
      this.connections.setSelectedConnectionIndex(
        this.connections.addConnection({ type: connectionType, state: 'new' })
      );
    }
  }

  async deleteConnection(connection) {
    if ((await this.showDeleteConnectionConfirmModal()) == 'ok') {
      if (!connection.isNew) {
        if (!(await this.save(this.connections.connections.filter(item => item !== connection)))) {
          return;
        }
      }
      this.connections.removeConnection(connection);
    }
  }

  async save(connections) {
    this.setLoading(true);
    this.setError('');
    const jsonToSave = {
      ui: {
        connections: connectionsToJson(connections),
        con_switch: switcherStoreToJson(this.switcher, connections),
      },
    };
    try {
      const needToReload = jsonToSave.ui.connections.some(cn => !cn.connection_uuid);
      await this.saveConnections(jsonToSave);
      this.connections.submit();
      this.switcher.submit();
      if (needToReload) {
        const savedConnections = await this.loadConnections();
        this.connections.updateUuids(savedConnections);
      }
      this.setLoading(false);
      return true;
    } catch (err) {
      if (err.data === 'EditorError' && err.code === CONFED_WRITE_FILE_ERROR) {
        this.setError(i18n.t('network-connections.errors.write'));
      } else {
        this.setError(err.message);
      }
      this.setLoading(false);
      return false;
    }
  }

  setSchemaAndData(schema, data) {
    this.connections.setSchemaAndData(schema, data.data);
    this.switcher.setUrlProperties(
      schema.properties.ui.properties.con_switch.properties.connectivity_check_url
    );
    connectionsStoreFromJson(this.connections, data);
    switcherStoreFromJson(this.switcher, data.ui.con_switch, this.connections);
    this.setError('');
    this.setLoading(false);
  }

  toggleConnectionState(connection) {
    if (connection.state === 'activated') {
      connection.setState('deactivating');
    } else {
      if (connection.state === 'not-connected' || connection.state === 'deactivated-by-cm') {
        connection.setState('activating');
      }
    }
    this.onToggleConnectionState(connection.data.connection_uuid);
  }

  async saveAll() {
    return await this.save(this.connections.connections);
  }

  setConnectionState(connectionUuid, state) {
    this.connections.setConnectionState(connectionUuid, state);
  }

  setConnectionConnectivity(connectionUuid, state) {
    this.connections.setConnectionConnectivity(connectionUuid, state);
  }

  setConnectionOperator(connectionUuid, state) {
    this.connections.setConnectionOperator(connectionUuid, state);
  }

  setConnectionSignalQuality(connectionUuid, state) {
    this.connections.setConnectionSignalQuality(connectionUuid, state);
  }

  setConnectionAccessTechnologies(connectionUuid, state) {
    this.connections.setConnectionAccessTechnologies(connectionUuid, state);
  }

  setError(msg) {
    this.error = msg;
  }

  setLoading(isLoading) {
    this.loading = isLoading;
  }
}

export default NetworkConnectionsPageStore;
