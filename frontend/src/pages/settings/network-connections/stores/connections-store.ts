import { makeAutoObservable } from 'mobx';
import { type ConnectionState, NetworkType } from '@/pages/settings/network-connections/stores/types';
import type { JsonSchema } from '@/stores/json-schema-editor';
import { SingleConnection, makeConnectionSchema } from './single-connection-store';

function createOrAssign(obj: any, key: string, subkey: string, value: any) {
  let prop = obj[key] || {};
  prop[subkey] = value;
  obj[key] = prop;
}

export class Connections {
  public connections: SingleConnection[] = [];
  public schema: JsonSchema;
  public additionalData = {};
  public lastConnectionState = {};

  constructor() {
    makeAutoObservable(this);
  }

  get deprecatedConnections() {
    return this.connections.filter((cn) => cn.isDeprecated).map((cn) => cn.name);
  }

  findConnection(uuid: string) {
    if (uuid === undefined) {
      return undefined;
    }
    return this.connections.find((item) => item.data.connection_uuid === uuid);
  }

  setSchemaAndData(schema: JsonSchema, data: any) {
    this.schema = schema;
    this.additionalData = data;
  }

  addConnection({ type, connectionData, state }: { type: NetworkType; connectionData?: any; state?: ConnectionState }) {
    const connectionInfo = connectionData ?? this.#getNewConnectionData(type, this.connections);
    connectionInfo.data = this.additionalData;

    const connection = new SingleConnection(
      makeConnectionSchema(type, this.schema),
      connectionInfo,
      state
    );
    this.connections.push(connection);
    this.connections = this.#stableSort(this.connections);
    return this.connections.findIndex((cn) => cn === connection);
  }

  removeConnection(connection: SingleConnection) {
    const index = this.connections.findIndex((el) => el === connection);
    if (index === -1) {
      return false;
    }
    this.connections.splice(index, 1);
    return true;
  }

  updateUuids(connectionsFromJson: any[]) {
    connectionsFromJson.forEach((cn) => {
      let res = this.findConnection(cn.connection_uuid);
      if (!res) {
        res = this.connections.find(
          (item) => cn.type === item.data.type && cn.connection_id === item.data.connection_id
        );
        if (res) {
          const connection = this.lastConnectionState[cn.connection_uuid];
          res.setUuid(cn.connection_uuid);
          res.setState(connection?.state);
          res.setConnectivity(connection?.connectivity);
          res.setOperator(connection?.operator);
          res.setSignalQuality(connection?.signal);
          res.setAccessTechnologies(connection?.ats);
        }
      }
    });
  }

  submit() {
    this.connections.forEach((cn) => cn.submit());
  }

  reset() {
    this.connections.forEach((cn) => cn.reset());
    const newConnections = this.connections.filter((cn) => cn.isNew);
    newConnections.forEach((cn) => this.removeConnection(cn));
  }

  get isDirty() {
    return this.connections.some((cn) => cn.isDirty);
  }

  setConnectionState(connectionUuid: string, state: ConnectionState) {
    createOrAssign(this.lastConnectionState, connectionUuid, 'state', state);
    this.findConnection(connectionUuid)?.setState(state);
  }

  setConnectionConnectivity(connectionUuid: string, connectivity: boolean) {
    createOrAssign(this.lastConnectionState, connectionUuid, 'connectivity', connectivity);
    this.findConnection(connectionUuid)?.setConnectivity(connectivity);
  }

  setConnectionOperator(connectionUuid: string, operator: string) {
    createOrAssign(this.lastConnectionState, connectionUuid, 'operator', operator);
    this.findConnection(connectionUuid)?.setOperator(operator);
  }

  setConnectionSignalQuality(connectionUuid: string, quality: number) {
    createOrAssign(this.lastConnectionState, connectionUuid, 'signal', quality);
    this.findConnection(connectionUuid)?.setSignalQuality(quality);
  }

  setConnectionAccessTechnologies(connectionUuid: string, accessTechnologies: string) {
    createOrAssign(this.lastConnectionState, connectionUuid, 'ats', accessTechnologies);
    this.findConnection(connectionUuid)?.setAccessTechnologies(accessTechnologies);
  }

  #stableSort(arr: SingleConnection[]) {
    const connectionTypeCompare = (cn1: SingleConnection, cn2: SingleConnection) => {
      if (cn1.data.type > cn2.data.type) {
        return 1;
      }
      if (cn1.data.type < cn2.data.type) {
        return -1;
      }
      return 0;
    };

    return arr
      .map((item, index) => ({ item, index }))
      .sort((a, b) => connectionTypeCompare(a.item, b.item) || a.index - b.index)
      .map(({ item }) => item);
  }

  #getNewConnectionData(type: NetworkType, connections: SingleConnection[]) {
    const findIndexForNewConnectionName = (pattern: string, connections: SingleConnection[]) => {
      let index = 1;
      const re = new RegExp(pattern);
      connections.forEach((cn) => {
        if (cn.data.connection_id) {
          const match = cn.data.connection_id.match(re);
          if (match) {
            const next = parseInt(match[1]) + 1;
            index = next > index ? next : index;
          }
        }
      });
      return index;
    };

    if (type === NetworkType.Can) {
      return { type: type, 'allow-hotplug': true, auto: true, options: { bitrate: 125000 } };
    }
    if (type === NetworkType.Ethernet) {
      return {
        type: type,
        connection_uuid: '',
        connection_id:
          'Wired connection ' + findIndexForNewConnectionName('Wired connection (\\d+)', connections),
      };
    }
    if (type === NetworkType.Modem) {
      return {
        type: type,
        connection_uuid: '',
        connection_id: 'gsm ' + findIndexForNewConnectionName('gsm (\\d+)', connections),
        'deactivate-by-priority': false,
      };
    }
    return { type, connection_uuid: '', connection_id: '' };
  }
}

export function connectionsStoreFromJson(store: Connections, json: any) {
  json.ui.connections
    .forEach((connectionData: any) => store.addConnection({ type: connectionData.type, connectionData }));
}
