// @vitest-environment happy-dom
import type { JsonSchema } from '@/stores/json-schema-editor';
import type { DeviceTypesStore } from '../device-types-store';
import { DeviceTabStore } from './device-tab-store';

// Minimal top-level device schema: the common (template-independent) identity params.
const commonParamsSchema = (): JsonSchema =>
  ({
    type: 'object',
    properties: {
      name: { type: 'string' },
      id: { type: 'string' },
      slave_id: { type: 'string' },
    },
    device: {},
  } as unknown as JsonSchema);

// Non-WB device type keeps ReadRegistersState at Unsupported, so setDeviceType does not
// try to read registers from a (non-existent) serial proxy.
const makeDeviceTypesStore = (schema: JsonSchema): DeviceTypesStore =>
  ({
    isUnknown: () => false,
    isDeprecated: () => false,
    withSubdevices: () => false,
    isModbusDevice: () => false,
    isWbDevice: () => false,
    getName: () => 'Device',
    getDefaultId: (type: string, slaveId: string) => `${type}_${slaveId}`,
    getSchema: async () => schema,
  } as unknown as DeviceTypesStore);

describe('DeviceTabStore.setDeviceType', () => {
  it('keeps the user-set device name and MQTT id when switching to another template', async () => {
    const deviceTypesStore = makeDeviceTypesStore(commonParamsSchema());
    const tab = new DeviceTabStore(
      { name: 'Kitchen light', id: 'kitchen_light', slave_id: '10' },
      'wb-old-template',
      deviceTypesStore,
    );
    await tab.loadContent();

    await tab.setDeviceType('wb-new-template', undefined);

    expect(tab.deviceType).toBe('wb-new-template');
    expect(tab.editedData.name).toBe('Kitchen light');
    expect(tab.mqttId).toBe('kitchen_light');
    expect(tab.slaveId).toBe('10');
  });

  it('falls back to the new template default MQTT id when none was set by the user', async () => {
    const deviceTypesStore = makeDeviceTypesStore(commonParamsSchema());
    const tab = new DeviceTabStore(
      { slave_id: '7' },
      'wb-old-template',
      deviceTypesStore,
    );
    await tab.loadContent();

    await tab.setDeviceType('wb-new-template', undefined);

    // No explicit id was preserved, so the id derives from the new device type.
    expect(tab.editedData.id).toBeUndefined();
    expect(tab.mqttId).toBe('wb-new-template_7');
    expect(tab.slaveId).toBe('7');
  });
});
