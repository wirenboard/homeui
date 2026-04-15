import { makeAutoObservable, reaction, runInAction } from 'mobx';
import { networkPath } from '@/common/paths';
import i18n from '~/i18n/react/config';
import { Connections, connectionsStoreFromJson } from './connections-store';
import { getConnectionJson, type SingleConnection } from './single-connection-store';
import { SwitcherStore, switcherStoreToJson, switcherStoreFromJson } from './switcher-store';
import { type Confirmation, ConnectionState, type NetworkType } from './types';

export class NetworkConnectionsPageStore {
  public error = '';
  public loading = true;
  public selectedTabIndex = 0;
  public connections: Connections;
  public switcher: SwitcherStore;

  #mqttClient: any;
  #whenMqttReady: any;
  #configEditorProxy: any;

  constructor(mqttClient: any, whenMqttReady: any, configEditorProxy: any) {
    this.connections = new Connections();
    this.switcher = new SwitcherStore(this.connections);

    this.#mqttClient = mqttClient;
    this.#whenMqttReady = whenMqttReady;
    this.#configEditorProxy = configEditorProxy;

    this.init();

    reaction(() => this.#mqttClient.isConnected(), (isConnected) => {
      if (this.error && isConnected) {
        runInAction(() => {
          this.setError('');
        });
      }
    });

    makeAutoObservable(this);
  }

  async init() {
    const re = new RegExp('/devices/system__networks__([^/]+)/');
    const getUuidFromTopic = (topic: string) => topic.match(re)?.[1];

    this.#whenMqttReady().then(() => {
      this.#configEditorProxy.Load({ path: networkPath })
        .then(({ schema, content }) => {
          this.setSchemaAndData(schema, content);
          this.#mqttClient.addStickySubscription('/devices/+/controls/State', ({ topic, payload }) => {
            this.setConnectionState(getUuidFromTopic(topic), payload);
          });
          this.#mqttClient.addStickySubscription('/devices/+/controls/Connectivity', ({ topic, payload }) => {
            this.setConnectionConnectivity(
              getUuidFromTopic(topic),
              payload !== '0',
            );
          });
          this.#mqttClient.addStickySubscription('/devices/+/controls/Operator', ({ topic, payload }) => {
            this.setConnectionOperator(getUuidFromTopic(topic), payload);
          });
          this.#mqttClient.addStickySubscription('/devices/+/controls/SignalQuality', ({ topic, payload }) => {
            this.setConnectionSignalQuality(getUuidFromTopic(topic), payload);
          });
          this.#mqttClient.addStickySubscription('/devices/+/controls/AccessTechnologies', ({ topic, payload }) => {
            this.setConnectionAccessTechnologies(getUuidFromTopic(topic), payload);
          });
        })
        .catch((err: any) => {
          this.setError(err.message);
        });
    });
  }

  async saveConnections(data: any){
    await this.#configEditorProxy.Save({ path: networkPath, content: data });
  }

  async loadConnections() {
    const res = await this.#configEditorProxy.Load({ path: networkPath });
    return res.content.ui.connections;
  }

  async onToggleConnectionState(uuid: string) {
    this.#mqttClient.send(`/devices/system__networks__${uuid}/controls/UpDown/on`, '1', false);
  }

  async onSelect(
    index: number,
    lastIndex: number,
    showHasChangesConfirm: Confirmation,
    showHasErrorsConfirm: Confirmation,
  ) {
    try {
      let activePageStore = lastIndex === 0 ? this.connections : this.switcher;
      const hasErrors = activePageStore === this.switcher && activePageStore.hasErrors;
      if (activePageStore.isDirty || hasErrors) {
        const action = hasErrors
          ? await showHasErrorsConfirm()
          : await showHasChangesConfirm();

        if (action === 'cancel') {
          return false;
        } else if (action === 'dont-save') {
          activePageStore.reset();
        } else if (action === 'save') {
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

  async allowConnectionSwitch(
    currentIndex: number,
    showHasChangesConfirm: Confirmation,
    showHasErrorsConfirm: Confirmation,
  ) {
    const activeConnection = this.connections.connections[currentIndex];
    if (!activeConnection?.isDirty) {
      return true;
    }

    const action = activeConnection.hasErrors
      ? await showHasErrorsConfirm()
      : await showHasChangesConfirm();

    switch (action) {
      case 'save':
        await this.saveAll();
        return true;
      case 'dont-save':
        if (activeConnection.isNew) {
          return this.connections.removeConnection(activeConnection);
        } else {
          activeConnection.reset();
          return true;
        }
      case 'cancel':
        return false;
    }
  }

  async selectConnection(
    newIndex: number,
    currentIndex: number,
    showHasChangesConfirm: Confirmation,
    showHasErrorsConfirm: Confirmation,
  ): Promise<number | null> {
    if (newIndex < 0 || newIndex >= this.connections.connections.length) return null;

    const lengthBefore = this.connections.connections.length;
    const canSwitch = await this.allowConnectionSwitch(currentIndex, showHasChangesConfirm, showHasErrorsConfirm);
    if (!canSwitch) return null;

    const wasRemoved = this.connections.connections.length < lengthBefore;
    return wasRemoved && currentIndex < newIndex ? newIndex - 1 : newIndex;
  }

  async createConnection(
    connectionType: NetworkType,
    currentIndex: number,
    showHasChangesConfirm: Confirmation,
    showHasErrorsConfirm: Confirmation,
  ): Promise<number | null> {
    if (await this.allowConnectionSwitch(currentIndex, showHasChangesConfirm, showHasErrorsConfirm)) {
      return this.connections.addConnection({ type: connectionType, state: ConnectionState.new });
    }
    return null;
  }

  async deleteConnection(connection: SingleConnection) {
    if (!connection.isNew) {
      if (!(await this.save(this.connections.connections.filter((item) => item !== connection)))) {
        return;
      }
    }
    this.connections.removeConnection(connection);
  }

  async save(connections: SingleConnection[]) {
    this.setError('');
    const jsonToSave = {
      ui: {
        connections: connections.map(({ editedData }) => getConnectionJson(editedData)),
        con_switch: switcherStoreToJson(this.switcher, connections),
      },
    };
    try {
      await this.saveConnections(jsonToSave);
      const needToReload = jsonToSave.ui.connections.some((cn) => !cn.connection_uuid);
      if (needToReload) {
        const savedConnections = await this.loadConnections();
        this.connections.updateUuids(savedConnections);
      }
      this.connections.submit();
      this.switcher.submit();
      return true;
    } catch (err) {
      const CONFED_WRITE_FILE_ERROR = 1002;
      if (err.data === 'EditorError' && err.code === CONFED_WRITE_FILE_ERROR) {
        this.setError(i18n.t('network-connections.errors.write'));
      } else {
        this.setError(err.message);
      }
      return false;
    }
  }

  setSchemaAndData(schema: any, data: any) {
    this.connections.setSchemaAndData(schema, data.data);
    this.switcher.setSchemaProperties(schema.properties.ui.properties.con_switch.properties);
    connectionsStoreFromJson(this.connections, data);
    switcherStoreFromJson(this.switcher, data.ui.con_switch, this.connections);
    this.setError('');
    this.setLoading(false);
  }

  toggleConnectionState(connection: SingleConnection) {
    if (connection.state === 'activated') {
      connection.setState(ConnectionState.deactivating);
    } else {
      if (connection.state === 'not-connected' || connection.state === 'deactivated-by-cm') {
        connection.setState(ConnectionState.activating);
      }
    }
    return this.onToggleConnectionState(connection.data.connection_uuid);
  }

  async saveAll() {
    return await this.save(this.connections.connections);
  }

  setConnectionState(connectionUuid: string, state: ConnectionState) {
    this.connections.setConnectionState(connectionUuid, state);
  }

  setConnectionConnectivity(connectionUuid: string, connectivity: boolean) {
    this.connections.setConnectionConnectivity(connectionUuid, connectivity);
  }

  setConnectionOperator(connectionUuid: string, operator: string) {
    this.connections.setConnectionOperator(connectionUuid, operator);
  }

  setConnectionSignalQuality(connectionUuid: string, quality: number) {
    this.connections.setConnectionSignalQuality(connectionUuid, quality);
  }

  setConnectionAccessTechnologies(connectionUuid: string, accessTechnologies: string) {
    this.connections.setConnectionAccessTechnologies(connectionUuid, accessTechnologies);
  }

  setError(msg: string) {
    this.error = msg;
  }

  setLoading(isLoading: boolean) {
    this.loading = isLoading;
  }
}
