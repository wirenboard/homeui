import { daliProxyMock } from '@/test/mocks/services';
import { GatewayStore } from './gateway-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/utils/format-error', () => import('@/test/mocks/format-error'));

describe('GatewayStore', () => {
  let store: GatewayStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new GatewayStore('gw1', 'Gateway 1');
  });

  describe('constructor', () => {
    test('sets id and label', () => {
      expect(store.id).toBe('gw1');
      expect(store.label).toBe('Gateway 1');
    });
  });

  describe('load', () => {
    test('fetches gateway data on first load', async () => {
      daliProxyMock.GetGateway.mockResolvedValue({
        config: { websocket_enabled: true, websocket_port: 9000 },
        schema: {},
        name: 'GW Updated',
      });

      await store.load();

      expect(daliProxyMock.GetGateway).toHaveBeenCalledWith({ gatewayId: 'gw1' });
      expect(store.websocketEnabled).toBe(true);
      expect(store.websocketPort).toBe(9000);
      expect(store.label).toBe('GW Updated');
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    test('skips subsequent loads', async () => {
      daliProxyMock.GetGateway.mockResolvedValue({
        config: {},
        schema: {},
        name: '',
      });

      await store.load();
      vi.clearAllMocks();
      await store.load();

      expect(daliProxyMock.GetGateway).not.toHaveBeenCalled();
    });

    test('sets error on failure', async () => {
      daliProxyMock.GetGateway.mockRejectedValue(new Error('fail'));

      await store.load();

      expect(store.error).toBe('fail');
      expect(store.isLoading).toBe(false);
    });

    test('defaults websocketEnabled to false when not in config', async () => {
      daliProxyMock.GetGateway.mockResolvedValue({
        config: {},
        schema: {},
        name: '',
      });

      await store.load();

      expect(store.websocketEnabled).toBe(false);
      expect(store.websocketPort).toBeUndefined();
    });
  });

  describe('setWebsocketEnabled', () => {
    test('updates and saves', async () => {
      daliProxyMock.SetGateway.mockResolvedValue(undefined);

      await store.setWebsocketEnabled(true);

      expect(store.websocketEnabled).toBe(true);
      expect(daliProxyMock.SetGateway).toHaveBeenCalledWith({
        gatewayId: 'gw1',
        config: { websocket_enabled: true },
      });
    });

    test('rolls back on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      store.websocketEnabled = false;
      daliProxyMock.SetGateway.mockRejectedValue(new Error('fail'));

      await store.setWebsocketEnabled(true);

      expect(store.websocketEnabled).toBe(false);
      expect(store.error).toBe('fail');
      consoleSpy.mockRestore();
    });
  });

  describe('setWebsocketPort', () => {
    test('updates and saves', async () => {
      daliProxyMock.SetGateway.mockResolvedValue(undefined);

      await store.setWebsocketPort(9001);

      expect(store.websocketPort).toBe(9001);
      expect(store.error).toBeNull();
    });

    test('sets error on failure', async () => {
      daliProxyMock.SetGateway.mockRejectedValue(new Error('fail'));

      await store.setWebsocketPort(9001);

      expect(store.error).toBe('fail');
    });
  });
});
