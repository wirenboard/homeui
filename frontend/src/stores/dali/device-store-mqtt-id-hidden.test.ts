import { loadJsonSchemaMock } from '@/test/mocks/json-schema-editor';
import { daliProxyMock } from '@/test/mocks/services';
import { DeviceStore } from './device-store';
import { daliHostCapabilities } from './host-capabilities';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/json-schema-editor', () => import('@/test/mocks/json-schema-editor'));
vi.mock('@/utils/format-error', () => import('@/test/mocks/format-error'));

describe('DeviceStore.load hides the MQTT id editor when the host has no external broker', () => {
  const schemaWithMqttId = () => ({
    translations: {},
    properties: { mqtt_id: { options: { grid_columns: 6 } }, name: {} },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    daliProxyMock.GetDevice.mockResolvedValue({ schema: {}, name: 'Lamp', config: { groups: [] } });
  });

  afterEach(() => {
    daliHostCapabilities.externalBroker = true;
  });

  it('marks mqtt_id hidden on a broker-less host, keeping its other options', async () => {
    daliHostCapabilities.externalBroker = false;
    const schema = schemaWithMqttId();
    loadJsonSchemaMock.mockReturnValue(schema as any);

    await new DeviceStore('dev1', 'Lamp').load();

    expect(schema.properties.mqtt_id.options).toEqual({ grid_columns: 6, hidden: true });
    expect(schema.properties.name).toEqual({});
  });

  it('leaves the schema alone on a controller host', async () => {
    const schema = schemaWithMqttId();
    loadJsonSchemaMock.mockReturnValue(schema as any);

    await new DeviceStore('dev1', 'Lamp').load();

    expect(schema.properties.mqtt_id.options).toEqual({ grid_columns: 6 });
  });
});
