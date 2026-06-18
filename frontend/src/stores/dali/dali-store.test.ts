import { daliProxyMock, mqttClientMock } from '@/test/mocks/services';
import { DaliStore } from './dali-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/json-schema-editor', () => import('@/test/mocks/json-schema-editor'));
vi.mock('@/utils/format-error', () => import('@/test/mocks/format-error'));

describe('DaliStore', () => {
  let store: DaliStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new DaliStore();
  });

  describe('load', () => {
    test('fetches hierarchy and creates gateway/bus/device stores', async () => {
      daliProxyMock.GetList.mockResolvedValue([
        {
          id: 'gw1',
          name: 'Gateway 1',
          buses: [
            {
              id: 'bus1',
              name: 'Bus 1',
              devices: [
                { id: 'dev1', name: 'Lamp', groups: [1] },
              ],
              groups: [],
            },
          ],
        },
      ]);

      await store.load();

      expect(mqttClientMock.whenConnected).toHaveBeenCalled();
      expect(store.gateways).toHaveLength(1);
      expect(store.gateways[0].id).toBe('gw1');
      expect(store.gateways[0].children).toHaveLength(1);
      expect(store.gateways[0].children[0].id).toBe('bus1');
      expect(store.isLoading).toBe(false);
      expect(store.errors).toBeUndefined();
    });

    test('sets errors on failure', async () => {
      daliProxyMock.GetList.mockRejectedValue(new Error('fail'));

      await store.load();

      expect(store.errors).toEqual([{ variant: 'danger', text: 'fail' }]);
      expect(store.isLoading).toBe(false);
    });
  });

  describe('destroy', () => {
    test('calls destroy on all buses', async () => {
      daliProxyMock.GetList.mockResolvedValue([
        {
          id: 'gw1',
          name: 'GW',
          buses: [
            { id: 'bus1', name: 'Bus', devices: [], groups: [] },
          ],
        },
      ]);
      await store.load();

      const bus = store.gateways[0].children[0];
      const destroySpy = vi.spyOn(bus, 'destroy');

      store.destroy();

      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('setError', () => {
    test('sets error info', () => {
      store.setError(new Error('broken'));
      expect(store.errors).toEqual([{ variant: 'danger', text: 'broken' }]);
    });

    test('clears errors when null', () => {
      store.setError(new Error('broken'));
      store.setError(null);
      expect(store.errors).toEqual([]);
    });
  });
});
