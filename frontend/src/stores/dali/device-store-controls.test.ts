import { daliProxyMock } from '@/test/mocks/services';
import { DeviceStore } from './device-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/json-schema-editor', () => import('@/test/mocks/json-schema-editor'));
vi.mock('@/utils/format-error', () => import('@/test/mocks/format-error'));

describe('DeviceStore.load maps the mqtt id that decides whether live controls render', () => {
  beforeEach(() => vi.clearAllMocks());

  it('takes mqtt_id from the config', async () => {
    daliProxyMock.GetDevice.mockResolvedValue({
      schema: {}, name: 'Lamp',
      config: { mqtt_id: 'wb-dali_17_bus_1_4', groups: [] },
    });
    const store = new DeviceStore('dev1', 'Lamp');
    await store.load();
    expect(store.mqttId).toBe('wb-dali_17_bus_1_4');
  });

  it('stays null when the config carries no mqtt_id', async () => {
    daliProxyMock.GetDevice.mockResolvedValue({ schema: {}, name: 'Lamp', config: { groups: [] } });
    const store = new DeviceStore('dev1', 'Lamp');
    await store.load();
    expect(store.mqttId).toBeNull();
  });
});
