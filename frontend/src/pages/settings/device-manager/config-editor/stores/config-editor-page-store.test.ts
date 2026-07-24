// @vitest-environment happy-dom
import { type DeviceTypesStore } from '@/stores/device-manager';
import type { ScannedDevice } from '@/stores/device-manager/types';
import { Translator, type JsonSchema } from '@/stores/json-schema-editor';
import { ConfigEditorPageStore } from './config-editor-page-store';
import { PortTab, makeSerialPortTabName } from './port-tab-store';

// A minimal serial device schema whose top-level (template-independent) properties include `sn`,
// so the serial number survives into editedData just as it does for real wb-mqtt-serial devices.
const deviceSchema = (): JsonSchema =>
  ({
    type: 'object',
    properties: {
      slave_id: { type: 'string' },
      sn: { type: 'string' },
      enabled: { type: 'boolean' },
    },
    device: {},
  } as unknown as JsonSchema);

// isWbDevice=false keeps ReadRegistersState at Unsupported, so loadContent does not try to read
// registers from a device over a (non-existent) serial proxy.
const makeDeviceTypesStore = (): DeviceTypesStore =>
  ({
    getSchema: async () => deviceSchema(),
    isUnknown: () => false,
    isDeprecated: () => false,
    withSubdevices: () => false,
    isModbusDevice: () => true,
    isWbDevice: () => false,
    getName: (type: string) => `name:${type}`,
    getDefaultId: (type: string, slaveId: string) => `${type}_${slaveId}`,
  } as unknown as DeviceTypesStore);

const makeStoreWithPort = (deviceTypesStore: DeviceTypesStore) => {
  const store = new ConfigEditorPageStore(
    async () => ({} as any),
    async () => {},
    () => {},
    () => {},
    deviceTypesStore,
    {} as any,
    {} as any,
    {} as any,
  );
  const portTab = new PortTab(
    { path: '/dev/ttyRS485-1', enabled: true, baud_rate: 9600, parity: 'N', data_bits: 8, stop_bits: 2 },
    {
      type: 'object',
      properties: {
        path: { type: 'string' },
        enabled: { type: 'boolean' },
        baud_rate: { type: 'number' },
        parity: { type: 'string' },
        data_bits: { type: 'number' },
        stop_bits: { type: 'number' },
      },
    } as unknown as JsonSchema,
    makeSerialPortTabName,
    new Translator(),
  );
  store.tabs.addPortTab(portTab, true);
  return { store, portTab };
};

const makeScannedDevice = (overrides: Partial<ScannedDevice> = {}): ScannedDevice =>
  ({
    title: 'Scanned device',
    sn: '4285517795',
    address: 5,
    type: 'wb-map12',
    port: '/dev/ttyRS485-1',
    baudRate: 9600,
    parity: 'N',
    stopBits: 2,
    gotByFastScan: false,
    bootloaderMode: false,
    ...overrides,
  } as ScannedDevice);

describe('ConfigEditorPageStore.addScannedDeviceToConfig serial-number persistence', () => {
  it('writes the scanned device serial number into the created device config entry', async () => {
    const { store, portTab } = makeStoreWithPort(makeDeviceTypesStore());

    await store.addScannedDeviceToConfig(makeScannedDevice({ sn: '4285517795' }), new Set<string>(), false);

    expect(portTab.children).toHaveLength(1);
    expect(portTab.children[0].editedData.sn).toBe('4285517795');
    expect(portTab.children[0].editedData.slave_id).toBe('5');
  });

  it('adds a device that reports no serial number without failing and without an sn entry', async () => {
    const { store, portTab } = makeStoreWithPort(makeDeviceTypesStore());

    await store.addScannedDeviceToConfig(makeScannedDevice({ sn: '' }), new Set<string>(), false);

    expect(portTab.children).toHaveLength(1);
    expect(portTab.children[0].editedData.sn).toBeUndefined();
    expect(portTab.children[0].editedData.slave_id).toBe('5');
  });
});
