import { Connections, connectionsStoreFromJson } from './connections-store';
import { ConnectionState, NetworkType } from './types';

vi.mock('./single-connection-store', async () => {
  const actual = await vi.importActual('./single-connection-store');
  return {
    ...actual,
    makeConnectionSchema: vi.fn(() => ({})),
  };
});

function makeSchema(): any {
  return {
    type: 'object',
    definitions: {
      nm_ethernet: { properties: {} },
      nm_modem: { properties: {} },
      nm_connection: { properties: { connection_id: {} } },
    },
    translations: {},
    properties: { data: {} },
  };
}

describe('Connections', () => {
  let store: Connections;

  beforeEach(() => {
    store = new Connections();
    store.setSchemaAndData(makeSchema(), { additional: true });
  });

  describe('addConnection', () => {
    test('adds ethernet connection with auto-incremented name', () => {
      const index = store.addConnection({ type: NetworkType.Ethernet, state: ConnectionState.new });
      expect(index).toBe(0);
      expect(store.connections).toHaveLength(1);
      expect(store.connections[0].data.connection_id).toBe('Wired connection 1');
    });

    test('auto-increments ethernet name based on existing connections', () => {
      store.addConnection({ type: NetworkType.Ethernet, state: ConnectionState.new });
      store.addConnection({ type: NetworkType.Ethernet, state: ConnectionState.new });
      expect(store.connections[1].data.connection_id).toBe('Wired connection 2');
    });

    test('adds modem connection with auto-incremented name', () => {
      store.addConnection({ type: NetworkType.Modem, state: ConnectionState.new });
      expect(store.connections[0].data.connection_id).toBe('gsm 1');
    });

    test('adds CAN connection with default bitrate config', () => {
      store.addConnection({ type: NetworkType.Can, state: ConnectionState.new });
      expect(store.connections[0].data['allow-hotplug']).toBe(true);
      expect(store.connections[0].data.options.bitrate).toBe(125000);
    });

    test('adds generic type with empty connection_id', () => {
      store.addConnection({ type: NetworkType.Wifi, state: ConnectionState.new });
      expect(store.connections[0].data.connection_id).toBe('');
    });

    test('uses provided connectionData when given', () => {
      const data = { type: NetworkType.Ethernet, connection_uuid: 'custom-uuid', connection_id: 'My Eth' };
      store.addConnection({ type: NetworkType.Ethernet, connectionData: data });
      expect(store.connections[0].data.connection_id).toBe('My Eth');
    });

    test('sorts connections by network type after adding', () => {
      store.addConnection({ type: NetworkType.Modem, state: ConnectionState.new });
      store.addConnection({ type: NetworkType.Ethernet, state: ConnectionState.new });
      expect(store.connections[0].data.type).toBe(NetworkType.Ethernet);
      expect(store.connections[1].data.type).toBe(NetworkType.Modem);
    });
  });

  describe('removeConnection', () => {
    test('removes existing connection and returns true', () => {
      store.addConnection({ type: NetworkType.Ethernet, state: ConnectionState.new });
      const cn = store.connections[0];
      expect(store.removeConnection(cn)).toBe(true);
      expect(store.connections).toHaveLength(0);
    });

    test('returns false for non-existing connection', () => {
      expect(store.removeConnection({} as any)).toBe(false);
    });
  });

  describe('findConnection', () => {
    test('finds connection by uuid', () => {
      const data = { type: NetworkType.Ethernet, connection_uuid: 'test-uuid', connection_id: 'test' };
      store.addConnection({ type: NetworkType.Ethernet, connectionData: data });
      expect(store.findConnection('test-uuid')).toBe(store.connections[0]);
    });

    test('returns undefined for missing uuid', () => {
      expect(store.findConnection('missing')).toBeUndefined();
    });

    test('returns undefined when uuid is undefined', () => {
      expect(store.findConnection(undefined)).toBeUndefined();
    });
  });

  describe('deprecatedConnections', () => {
    test('returns names of deprecated connections', () => {
      const data = { type: 'static', name: 'eth0' };
      store.addConnection({ type: 'static' as any, connectionData: data });
      expect(store.deprecatedConnections).toContain('eth0');
    });

    test('returns empty array when none deprecated', () => {
      store.addConnection({ type: NetworkType.Ethernet, state: ConnectionState.new });
      expect(store.deprecatedConnections).toHaveLength(0);
    });
  });

  describe('isDirty', () => {
    test('false when no connections are dirty', () => {
      store.addConnection({ type: NetworkType.Ethernet, state: ConnectionState.new });
      store.connections[0].isDirty = false;
      expect(store.isDirty).toBe(false);
    });

    test('true when any connection is dirty', () => {
      store.addConnection({ type: NetworkType.Ethernet, state: ConnectionState.new });
      store.connections[0].isDirty = true;
      expect(store.isDirty).toBe(true);
    });
  });

  describe('submit', () => {
    test('calls submit on all connections', () => {
      store.addConnection({ type: NetworkType.Ethernet, state: ConnectionState.new });
      store.addConnection({ type: NetworkType.Modem, state: ConnectionState.new });
      const spy0 = vi.spyOn(store.connections[0], 'submit');
      const spy1 = vi.spyOn(store.connections[1], 'submit');
      store.submit();
      expect(spy0).toHaveBeenCalled();
      expect(spy1).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    test('resets all connections and removes new ones', () => {
      const data = { type: NetworkType.Ethernet, connection_uuid: 'u1', connection_id: 'Wired 1' };
      store.addConnection({ type: NetworkType.Ethernet, connectionData: data, state: ConnectionState.activated });
      store.addConnection({ type: NetworkType.Ethernet, state: ConnectionState.new });
      expect(store.connections).toHaveLength(2);

      store.reset();
      expect(store.connections).toHaveLength(1);
      expect(store.connections[0].data.connection_uuid).toBe('u1');
    });
  });

  describe('setConnectionState', () => {
    test('sets state on matching connection', () => {
      const data = { type: NetworkType.Ethernet, connection_uuid: 'u1', connection_id: 'eth' };
      store.addConnection({ type: NetworkType.Ethernet, connectionData: data });
      store.setConnectionState('u1', ConnectionState.activated);
      expect(store.connections[0].state).toBe('activated');
    });

    test('stores in lastConnectionState even without matching connection', () => {
      store.setConnectionState('unknown-uuid', ConnectionState.activated);
      expect(store.lastConnectionState['unknown-uuid'].state).toBe('activated');
    });
  });

  describe('setConnectionConnectivity', () => {
    test('updates connectivity on matching connection', () => {
      const data = { type: NetworkType.Ethernet, connection_uuid: 'u1', connection_id: 'eth' };
      store.addConnection({ type: NetworkType.Ethernet, connectionData: data });
      store.setConnectionConnectivity('u1', true);
      expect(store.connections[0].connectivity).toBe(true);
    });
  });

  describe('setConnectionOperator / setConnectionSignalQuality / setConnectionAccessTechnologies', () => {
    test('sets operator, signal, and access tech on matching connection', () => {
      const data = { type: NetworkType.Modem, connection_uuid: 'm1', connection_id: 'gsm' };
      store.addConnection({ type: NetworkType.Modem, connectionData: data });
      store.setConnectionOperator('m1', 'MTS');
      store.setConnectionSignalQuality('m1', 75);
      store.setConnectionAccessTechnologies('m1', 'LTE');

      expect(store.connections[0].operator).toBe('MTS');
      expect(store.connections[0].signalQuality).toBe(75);
      expect(store.connections[0].accessTechnologies).toBe('LTE');
    });
  });

  describe('updateUuids', () => {
    test('sets uuid from server response for new connections matched by type+id', () => {
      store.addConnection({ type: NetworkType.Ethernet, state: ConnectionState.new });
      const cn = store.connections[0];
      const connectionId = cn.data.connection_id;

      store.setConnectionState('server-uuid', ConnectionState.activated);

      store.updateUuids([{
        type: NetworkType.Ethernet,
        connection_id: connectionId,
        connection_uuid: 'server-uuid',
      }]);
      expect(cn.data.connection_uuid).toBe('server-uuid');
    });
  });
});

describe('connectionsStoreFromJson', () => {
  test('populates connections from JSON data', () => {
    const store = new Connections();
    store.setSchemaAndData(makeSchema(), {});
    const json = {
      ui: {
        connections: [
          { type: NetworkType.Ethernet, connection_uuid: 'u1', connection_id: 'Wired 1' },
          { type: NetworkType.Modem, connection_uuid: 'u2', connection_id: 'gsm 1' },
        ],
      },
    };
    connectionsStoreFromJson(store, json);
    expect(store.connections).toHaveLength(2);
  });
});
