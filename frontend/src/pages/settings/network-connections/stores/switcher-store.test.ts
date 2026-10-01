// @vitest-environment happy-dom
import { TierLevel } from '../components/switcher/types';
import { Connections } from './connections-store';
import { SingleConnection } from './single-connection-store';
import { ConnectionPrioritiesStore, SwitcherStore, switcherStoreToJson, switcherStoreFromJson } from './switcher-store';
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
      nm_wifi: { properties: {} },
      nm_connection: { properties: { connection_id: {} } },
    },
    translations: {},
    properties: { data: {} },
  };
}

function makeConnectionsStore() {
  const store = new Connections();
  store.setSchemaAndData(makeSchema(), {});
  return store;
}

const schemaProperties = {
  sticky_connection_period_s: { default: 300 },
  connectivity_check_url: { default: 'http://example.com', minLength: 5 },
  connectivity_check_payload: { default: 'test' },
};

function makeSwitcherWithSchema(connections: Connections) {
  const switcher = new SwitcherStore(connections);
  switcher.setSchemaProperties(schemaProperties);
  return switcher;
}

function addManageableConnection(store: Connections, type: NetworkType, name: string) {
  const data = {
    type,
    connection_uuid: `uuid-${name}`,
    connection_id: name,
    connection_autoconnect: true,
    ipv4: { method: 'auto' },
  };
  store.addConnection({ type, connectionData: data, state: ConnectionState.activated });
  return store.connections.find((cn) => cn.data.connection_id === name);
}

describe('ConnectionPrioritiesStore', () => {
  test('initializes with three tiers', () => {
    const connections = makeConnectionsStore();
    const priorities = new ConnectionPrioritiesStore(connections);
    expect(priorities.tiers).toHaveLength(3);
    expect(priorities.tiers[0].id).toBe(TierLevel.High);
    expect(priorities.tiers[1].id).toBe(TierLevel.Medium);
    expect(priorities.tiers[2].id).toBe(TierLevel.Low);
  });

  test('moveConnectionToTier moves connection between tiers', () => {
    const connections = makeConnectionsStore();
    const priorities = new ConnectionPrioritiesStore(connections);
    const cn = new SingleConnection({}, {
      type: NetworkType.Ethernet, connection_uuid: 'u1', connection_id: 'eth0',
      connection_autoconnect: true, ipv4: { method: 'auto' },
    }, ConnectionState.activated);

    priorities.tiers[0].connections.push(cn);
    priorities.moveConnectionToTier(cn, priorities.tiers[2]);

    expect(priorities.tiers[0].connections).not.toContain(cn);
    expect(priorities.tiers[2].connections).toContain(cn);
    expect(priorities.isDirty).toBe(true);
  });

  test('moveConnectionToTier no-ops when already in target tier', () => {
    const connections = makeConnectionsStore();
    const priorities = new ConnectionPrioritiesStore(connections);
    const cn = new SingleConnection({}, {
      type: NetworkType.Ethernet, connection_uuid: 'u1', connection_id: 'eth0',
      connection_autoconnect: true,
    }, ConnectionState.activated);

    priorities.tiers[0].connections.push(cn);
    priorities.isDirty = false;
    priorities.moveConnectionToTier(cn, priorities.tiers[0]);
    expect(priorities.isDirty).toBe(false);
  });

  test('submit copies tiers to storedTiers and clears dirty', () => {
    const connections = makeConnectionsStore();
    const priorities = new ConnectionPrioritiesStore(connections);
    priorities.isDirty = true;
    priorities.submit();
    expect(priorities.isDirty).toBe(false);
  });

  test('reset copies storedTiers back to tiers', () => {
    const connections = makeConnectionsStore();
    const priorities = new ConnectionPrioritiesStore(connections);
    const cn = new SingleConnection({}, {
      type: NetworkType.Ethernet, connection_uuid: 'u1', connection_id: 'eth0',
      connection_autoconnect: true,
    }, ConnectionState.activated);

    priorities.tiers[0].connections.push(cn);
    priorities.submit();

    priorities.moveConnectionToTier(cn, priorities.tiers[2]);
    expect(priorities.tiers[2].connections).toContain(cn);

    priorities.reset();
    expect(priorities.tiers[0].connections).toContain(cn);
    expect(priorities.tiers[2].connections).not.toContain(cn);
  });
});

describe('SwitcherStore', () => {
  test('initializes with form stores', () => {
    const connections = makeConnectionsStore();
    const switcher = new SwitcherStore(connections);
    expect(switcher.connectivityUrl).toBeDefined();
    expect(switcher.connectivityPayload).toBeDefined();
    expect(switcher.debug).toBeDefined();
    expect(switcher.stickyConnectionPeriod).toBeDefined();
  });

  test('isDirty returns true when any sub-store is dirty', () => {
    const connections = makeConnectionsStore();
    const switcher = new SwitcherStore(connections);
    expect(switcher.isDirty).toBe(false);
    switcher.debug.setValue(true);
    switcher.debug.submit();
    switcher.debug.setValue(false);
    expect(switcher.isDirty).toBe(true);
  });

  test('submit clears dirty state for all sub-stores', () => {
    const connections = makeConnectionsStore();
    const switcher = makeSwitcherWithSchema(connections);
    switcher.debug.setValue(true);
    switcher.submit();
    expect(switcher.isDirty).toBe(false);
  });

  test('reset reverts all sub-stores', () => {
    const connections = makeConnectionsStore();
    const switcher = makeSwitcherWithSchema(connections);
    switcher.debug.setValue(false);
    switcher.debug.submit();
    switcher.debug.setValue(true);
    expect(switcher.debug.value).toBe(true);
    switcher.reset();
    expect(switcher.debug.value).toBe(false);
  });

  test('setSchemaProperties sets defaults from schema', () => {
    const connections = makeConnectionsStore();
    const switcher = new SwitcherStore(connections);
    switcher.setSchemaProperties({
      sticky_connection_period_s: { default: 300 },
      connectivity_check_url: { default: 'http://example.com', minLength: 5 },
      connectivity_check_payload: { default: 'test' },
    });
    expect(switcher.stickyConnectionPeriod.defaultText).toBe(300);
    expect(switcher.connectivityUrl.defaultText).toBe('http://example.com');
    expect(switcher.connectivityPayload.defaultText).toBe('test');
  });

  test('hasErrors returns true when connectivity URL has errors', () => {
    const connections = makeConnectionsStore();
    const switcher = new SwitcherStore(connections);
    switcher.setSchemaProperties({
      sticky_connection_period_s: { default: 300 },
      connectivity_check_url: { default: 'http://x.com', minLength: 5 },
      connectivity_check_payload: { default: '' },
    });
    switcher.connectivityUrl.setValue('bad');
    expect(switcher.hasErrors).toBe(true);
  });
});

describe('switcherStoreToJson', () => {
  test('serializes switcher state to JSON', () => {
    const connections = makeConnectionsStore();
    const cn = addManageableConnection(connections, NetworkType.Ethernet, 'Wired 1');
    const switcher = makeSwitcherWithSchema(connections);

    switcher.stickyConnectionPeriod.setValue(600);
    switcher.connectivityUrl.setValue('http://check.com');
    switcher.connectivityPayload.setValue('payload');
    switcher.debug.setValue(true);
    switcher.connectionPriorities.tiers[0].connections = [cn];

    const json = switcherStoreToJson(switcher, connections.connections);
    expect(json.sticky_connection_period_s).toBe(600);
    expect(json.connectivity_check_url).toBe('http://check.com');
    expect(json.connectivity_check_payload).toBe('payload');
    expect(json.debug).toBe(true);
    expect(json.tiers[TierLevel.High]).toContain('Wired 1');
  });

  test('omits empty optional fields', () => {
    const connections = makeConnectionsStore();
    const switcher = new SwitcherStore(connections);
    const json = switcherStoreToJson(switcher, []);
    expect(json.sticky_connection_period_s).toBeUndefined();
    expect(json.connectivity_check_url).toBeUndefined();
    expect(json.debug).toBeUndefined();
  });
});

describe('switcherStoreFromJson', () => {
  test('populates switcher store from JSON', () => {
    const connections = makeConnectionsStore();
    addManageableConnection(connections, NetworkType.Ethernet, 'Wired 1');
    const switcher = makeSwitcherWithSchema(connections);

    switcherStoreFromJson(switcher, {
      sticky_connection_period_s: 600,
      connectivity_check_url: 'http://test.com',
      connectivity_check_payload: 'pay',
      debug: true,
      tiers: {
        [TierLevel.High]: ['Wired 1'],
        [TierLevel.Medium]: [],
        [TierLevel.Low]: [],
      },
    }, connections);

    expect(switcher.stickyConnectionPeriod.value).toBe(600);
    expect(switcher.connectivityUrl.value).toBe('http://test.com');
    expect(switcher.connectivityPayload.value).toBe('pay');
    expect(switcher.debug.value).toBe(true);
    expect(switcher.connectionPriorities.tiers[0].connections).toHaveLength(1);
    expect(switcher.isDirty).toBe(false);
  });
});
