// @vitest-environment happy-dom
import { configEditorProxyMock, mqttClientMock } from '@/test/mocks/services';
import { NetworkConnectionsPageStore } from './page-store';
import { ConnectionState, NetworkType } from './types';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('./single-connection-store', async () => {
  const actual = await vi.importActual('./single-connection-store');
  return { ...actual, makeConnectionSchema: vi.fn(() => ({})) };
});

function makeSchemaAndContent() {
  const schema: any = {
    type: 'object',
    definitions: {
      nm_ethernet: { properties: {} },
      nm_modem: { properties: {} },
      nm_connection: { properties: { connection_id: {} } },
    },
    translations: {},
    properties: {
      data: {},
      ui: {
        properties: {
          con_switch: {
            properties: {
              sticky_connection_period_s: { default: 300 },
              connectivity_check_url: { default: 'http://x.com', minLength: 5 },
              connectivity_check_payload: { default: '' },
            },
          },
        },
      },
    },
  };
  const content = {
    data: {},
    ui: {
      connections: [
        { type: NetworkType.Ethernet, connection_uuid: 'u1', connection_id: 'eth0' },
      ],
      con_switch: {
        tiers: { high: ['eth0'], medium: [], low: [] },
      },
    },
  };
  return { schema, content };
}

describe('NetworkConnectionsPageStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configEditorProxyMock.Load.mockResolvedValue(makeSchemaAndContent());
    configEditorProxyMock.Save.mockResolvedValue({});
  });

  test('initializes with loading=true', () => {
    const store = new NetworkConnectionsPageStore();
    expect(store.loading).toBe(true);
  });

  test('sets schema and data after init', async () => {
    const store = new NetworkConnectionsPageStore();
    await vi.waitFor(() => expect(store.loading).toBe(false));
    expect(store.connections.connections).toHaveLength(1);
    expect(store.error).toBe('');
  });

  test('sets error on load failure', async () => {
    configEditorProxyMock.Load.mockRejectedValue(new Error('load failed'));
    const store = new NetworkConnectionsPageStore();
    await vi.waitFor(() => expect(store.error).toBe('load failed'));
  });

  test('isDirty reflects connections and switcher state', async () => {
    const store = new NetworkConnectionsPageStore();
    await vi.waitFor(() => expect(store.loading).toBe(false));
    expect(store.isDirty).toBe(false);
  });

  describe('toggleConnectionState', () => {
    test('sets deactivating state for activated connection', async () => {
      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));
      const cn = store.connections.connections[0];
      cn.setState(ConnectionState.activated);

      store.toggleConnectionState(cn);
      expect(cn.state).toBe('deactivating');
      expect(mqttClientMock.send).toHaveBeenCalled();
    });

    test('sets activating state for not-connected connection', async () => {
      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));
      const cn = store.connections.connections[0];
      cn.setState(ConnectionState['not-connected']);

      store.toggleConnectionState(cn);
      expect(cn.state).toBe('activating');
    });
  });

  describe('save', () => {
    test('saves and submits on success', async () => {
      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));
      const result = await store.saveAll();
      expect(result).toBe(true);
      expect(configEditorProxyMock.Save).toHaveBeenCalled();
    });

    test('sets write error on EditorError', async () => {
      configEditorProxyMock.Save.mockRejectedValue({ data: 'EditorError', code: 1002 });
      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));
      const result = await store.saveAll();
      expect(result).toBe(false);
      expect(store.error).not.toBe('');
    });

    test('sets generic error message on other failures', async () => {
      configEditorProxyMock.Save.mockRejectedValue({ message: 'generic error' });
      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));
      const result = await store.saveAll();
      expect(result).toBe(false);
      expect(store.error).toBe('generic error');
    });

    test('reloads connections when new UUIDs are missing', async () => {
      const { schema, content } = makeSchemaAndContent();
      content.ui.connections[0].connection_uuid = '';
      configEditorProxyMock.Load
        .mockResolvedValueOnce({ schema, content })
        .mockResolvedValueOnce({
          content: {
            ui: {
              connections: [
                { type: NetworkType.Ethernet, connection_uuid: 'new-uuid', connection_id: 'eth0' },
              ],
            },
          },
        });

      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));
      await store.saveAll();
      expect(configEditorProxyMock.Load).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteConnection', () => {
    test('removes new connection without saving', async () => {
      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));
      store.connections.addConnection({ type: NetworkType.Ethernet, state: ConnectionState.new });
      const newCn = store.connections.connections.find((cn) => cn.isNew);
      const countBefore = store.connections.connections.length;

      await store.deleteConnection(newCn);
      expect(store.connections.connections.length).toBe(countBefore - 1);
      expect(configEditorProxyMock.Save).not.toHaveBeenCalled();
    });

    test('saves remaining connections when deleting existing', async () => {
      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));
      const cn = store.connections.connections[0];

      await store.deleteConnection(cn);
      expect(configEditorProxyMock.Save).toHaveBeenCalled();
    });
  });

  describe('onSelect (tab switching)', () => {
    test('returns true and switches tab when no dirty state', async () => {
      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));

      const showChanges = vi.fn();
      const showErrors = vi.fn();
      const result = await store.onSelect(1, 0, showChanges, showErrors);
      expect(result).toBe(true);
      expect(store.selectedTabIndex).toBe(1);
    });

    test('returns false when cancel is chosen on dirty tab', async () => {
      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));
      store.connections.connections[0].isDirty = true;

      const showChanges = vi.fn().mockResolvedValue('cancel');
      const showErrors = vi.fn();
      const result = await store.onSelect(1, 0, showChanges, showErrors);
      expect(result).toBe(false);
    });
  });

  describe('selectConnection', () => {
    test('returns target index for clean connection', async () => {
      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));
      store.connections.addConnection({ type: NetworkType.Modem, state: ConnectionState.new });

      const result = await store.selectConnection(1, 0, vi.fn(), vi.fn());
      expect(result).toBe(1);
    });

    test('returns null for out-of-range index', async () => {
      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));

      const result = await store.selectConnection(99, 0, vi.fn(), vi.fn());
      expect(result).toBeNull();
    });
  });

  describe('createConnection', () => {
    test('adds new connection and returns its index', async () => {
      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));

      const index = await store.createConnection(NetworkType.Modem, 0, vi.fn(), vi.fn());
      expect(index).not.toBeNull();
      expect(store.connections.connections.some((cn) => cn.isNew)).toBe(true);
    });
  });

  describe('setConnectionState / setConnectionConnectivity', () => {
    test('delegates to connections store', async () => {
      const store = new NetworkConnectionsPageStore();
      await vi.waitFor(() => expect(store.loading).toBe(false));

      store.setConnectionState('u1', ConnectionState.activated);
      expect(store.connections.connections[0].state).toBe('activated');

      store.setConnectionConnectivity('u1', true);
      expect(store.connections.connections[0].connectivity).toBe(true);
    });
  });
});
