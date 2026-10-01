import { SingleConnection, getConnectionJson, makeConnectionSchema } from './single-connection-store';
import { ConnectionState, NetworkType } from './types';

function makeEthernetData(overrides = {}) {
  return {
    type: NetworkType.Ethernet,
    connection_uuid: 'eth-uuid-1',
    connection_id: 'Wired connection 1',
    connection_autoconnect: true,
    ...overrides,
  };
}

function makeCanData(overrides = {}) {
  return {
    type: NetworkType.Can,
    name: 'can0',
    auto: true,
    'allow-hotplug': true,
    options: { bitrate: 125000 },
    ...overrides,
  };
}

describe('SingleConnection', () => {
  describe('constructor', () => {
    test('sets provided state for NM types', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      expect(cn.state).toBe('activated');
    });

    test('defaults to not-connected for NM types without explicit state', () => {
      const cn = new SingleConnection({}, makeEthernetData(), undefined);
      expect(cn.state).toBe('not-connected');
    });

    test('keeps unknown state for CAN type without explicit state', () => {
      const cn = new SingleConnection({}, makeCanData(), undefined);
      expect(cn.state).toBe('unknown');
    });

    test('sets deprecated for unknown network types', () => {
      const cn = new SingleConnection({}, { type: 'static', name: 'eth0' }, undefined);
      expect(cn.state).toBe('deprecated');
    });

    test('sets name from connection_id', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      expect(cn.name).toBe('Wired connection 1');
    });

    test('sets name from data.name when no connection_id', () => {
      const cn = new SingleConnection({}, makeCanData(), undefined);
      expect(cn.name).toBe('can0');
    });

    test('sets editedConnectionId from connection_id', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      expect(cn.editedConnectionId).toBe('Wired connection 1');
    });
  });

  describe('computed: description', () => {
    test('returns empty string for unknown state', () => {
      const cn = new SingleConnection({}, makeCanData(), undefined);
      expect(cn.description).toBe('');
    });

    test('returns limited-connectivity for activated without connectivity (non-AP)', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      expect(cn.description).toBe('network-connections.labels.limited-connectivity');
    });

    test('returns activated label when connectivity is true', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      cn.setConnectivity(true);
      expect(cn.description).toBe('network-connections.labels.activated');
    });

    test('returns activated for WiFi AP without connectivity', () => {
      const data = {
        type: NetworkType.WifiAp, connection_uuid: 'ap-1',
        connection_id: 'AP',
        connection_autoconnect: true,
      };
      const cn = new SingleConnection({}, data, ConnectionState.activated);
      expect(cn.description).toBe('network-connections.labels.activated');
    });

    test('returns state label for non-activated states', () => {
      const cn = new SingleConnection({}, makeEthernetData(), undefined);
      expect(cn.description).toBe('network-connections.labels.not-connected');
    });
  });

  describe('computed: isNew, managedByNM, isDeprecated', () => {
    test('isNew is true when state is new', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.new);
      expect(cn.isNew).toBe(true);
    });

    test('managedByNM is true for ethernet', () => {
      expect(new SingleConnection({}, makeEthernetData(), ConnectionState.activated).managedByNM).toBe(true);
    });

    test('managedByNM is false for CAN', () => {
      expect(new SingleConnection({}, makeCanData(), undefined).managedByNM).toBe(false);
    });

    test('managedByNM is false for deprecated types', () => {
      expect(new SingleConnection({}, { type: 'static', name: 'x' }, undefined).managedByNM).toBe(false);
    });

    test('isDeprecated is true for deprecated state', () => {
      expect(new SingleConnection({}, { type: 'dhcp', name: 'x' }, undefined).isDeprecated).toBe(true);
    });
  });

  describe('computed: allowSwitchState', () => {
    test('true for activated', () => {
      expect(new SingleConnection({}, makeEthernetData(), ConnectionState.activated).allowSwitchState).toBe(true);
    });

    test('true for not-connected', () => {
      expect(new SingleConnection({}, makeEthernetData(), undefined).allowSwitchState).toBe(true);
    });

    test('false for new', () => {
      expect(new SingleConnection({}, makeEthernetData(), ConnectionState.new).allowSwitchState).toBe(false);
    });

    test('false for activating', () => {
      expect(new SingleConnection({}, makeEthernetData(), ConnectionState.activating).allowSwitchState).toBe(false);
    });
  });

  describe('computed: hasErrors', () => {
    test('true when hasValidationErrors is set', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      cn.hasValidationErrors = true;
      expect(cn.hasErrors).toBe(true);
    });

    test('true when NM connection has empty editedConnectionId', () => {
      const cn = new SingleConnection({}, makeEthernetData({ connection_id: '' }), ConnectionState.new);
      expect(cn.hasErrors).toBe(true);
    });

    test('false for CAN with no validation errors', () => {
      const cn = new SingleConnection({}, makeCanData(), undefined);
      expect(cn.hasErrors).toBe(false);
    });
  });

  describe('computed: withAutoconnect', () => {
    test('returns connection_autoconnect for NM types', () => {
      expect(new SingleConnection(
        {},
        makeEthernetData({ connection_autoconnect: false }),
        ConnectionState.activated).withAutoconnect)
        .toBe(false);
    });

    test('returns auto for CAN', () => {
      expect(new SingleConnection({}, makeCanData({ auto: false }), undefined).withAutoconnect).toBe(false);
    });

    test('returns auto for deprecated types', () => {
      expect(new SingleConnection({}, { type: 'static', name: 'x', auto: true }, undefined).withAutoconnect).toBe(true);
    });
  });

  describe('setEditedData', () => {
    test('marks dirty when data changes', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      cn.setEditedData({ ...makeEthernetData(), extra: 'x' }, []);
      expect(cn.isDirty).toBe(true);
    });

    test('sets hasValidationErrors from errors array', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      cn.setEditedData(makeEthernetData(), ['err']);
      expect(cn.hasValidationErrors).toBe(true);
    });

    test('auto-sets connectionId from WiFi SSID for new connections', () => {
      const data = {
        type: NetworkType.Wifi,
        connection_uuid: '',
        connection_id: '',
        connection_autoconnect: true,
        '802-11-wireless_ssid': '',
      };
      const cn = new SingleConnection({}, data, ConnectionState.new);
      cn.setEditedData({ ...data, '802-11-wireless_ssid': 'MyNet' }, []);
      expect(cn.editedConnectionId).toBe('MyNet');
    });
  });

  describe('setConnectionId', () => {
    test('updates id and marks dirty', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      cn.setConnectionId('New Name');
      expect(cn.editedConnectionId).toBe('New Name');
      expect(cn.isDirty).toBe(true);
    });

    test('no-ops when id unchanged', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      cn.setConnectionId('Wired connection 1');
      expect(cn.isDirty).toBe(false);
    });
  });

  describe('submit', () => {
    test('copies editedData to data and clears dirty', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      cn.setConnectionId('Changed');
      cn.submit();
      expect(cn.isDirty).toBe(false);
      expect(cn.data.connection_id).toBe('Changed');
    });

    test('transitions new NM connection to not-connected', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.new);
      cn.submit();
      expect(cn.state).toBe('not-connected');
    });

    test('transitions CAN to unknown', () => {
      const cn = new SingleConnection({}, makeCanData(), ConnectionState.new);
      cn.submit();
      expect(cn.state).toBe('unknown');
    });
  });

  describe('reset', () => {
    test('reverts changes and clears dirty', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      cn.setConnectionId('Changed');
      cn.reset();
      expect(cn.isDirty).toBe(false);
      expect(cn.editedConnectionId).toBe('Wired connection 1');
    });
  });

  describe('setUuid', () => {
    test('sets uuid for NM connections', () => {
      const cn = new SingleConnection({}, makeEthernetData({ connection_uuid: '' }), ConnectionState.new);
      cn.setUuid('new-uuid');
      expect(cn.data.connection_uuid).toBe('new-uuid');
    });

    test('does not set uuid for CAN', () => {
      const cn = new SingleConnection({}, makeCanData(), undefined);
      cn.setUuid('new-uuid');
      expect(cn.data.connection_uuid).toBeUndefined();
    });
  });

  describe('setState', () => {
    test('sets valid state', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      cn.setState(ConnectionState.deactivating);
      expect(cn.state).toBe('deactivating');
    });

    test('falls back to not-connected for invalid state', () => {
      const cn = new SingleConnection({}, makeEthernetData(), ConnectionState.activated);
      cn.setState('bogus' as any);
      expect(cn.state).toBe('not-connected');
    });
  });
});

describe('getConnectionJson', () => {
  test('removes data property from connection object', () => {
    const result = getConnectionJson({ type: '01_nm_ethernet', connection_uuid: 'u1', data: { x: 1 } });
    expect(result.data).toBeUndefined();
    expect(result.type).toBe('01_nm_ethernet');
    expect(result.connection_uuid).toBe('u1');
  });
});

describe('makeConnectionSchema', () => {
  const fullSchema = {
    definitions: {
      nm_ethernet: { properties: {}, options: {} },
      nm_modem: { allOf: [{ properties: {} }], options: {} },
      nm_connection: { properties: { connection_id: { minLength: 1 } } },
    },
    translations: { en: {} },
    properties: { data: { type: 'object' } },
  };

  test('creates schema for ethernet type with data property', () => {
    const schema = makeConnectionSchema(NetworkType.Ethernet, fullSchema);
    expect(schema.translations).toEqual({ en: {} });
    expect(schema.options.wb.disable_title).toBe(true);
    expect(schema.properties.data).toEqual({ type: 'object' });
  });

  test('appends data schema to allOf for modem type', () => {
    const schema = makeConnectionSchema(NetworkType.Modem, fullSchema);
    expect(schema.allOf).toHaveLength(2);
    expect(schema.allOf[1].properties.data).toEqual({ type: 'object' });
  });

  test('removes minLength from connection_id in definitions', () => {
    const schema = makeConnectionSchema(NetworkType.Ethernet, fullSchema);
    expect(schema.definitions.nm_connection.properties.connection_id.minLength).toBeUndefined();
  });
});
