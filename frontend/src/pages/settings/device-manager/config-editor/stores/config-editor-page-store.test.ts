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

const addSelectedDeviceTab = async (store: ConfigEditorPageStore, portTab: PortTab) => {
  const deviceTab = store.createDeviceTab({ slave_id: '5' });
  store.tabs.addDeviceTab(portTab, deviceTab, true);
  await deviceTab.loadContent(portTab.baseConfig);
  return deviceTab;
};

describe('ConfigEditorPageStore.readRegisters forced reread', () => {
  it('keeps the unsaved settings of the device when the user declines the confirmation', async () => {
    const { store, portTab } = makeStoreWithPort(makeDeviceTypesStore());
    const deviceTab = await addSelectedDeviceTab(store, portTab);
    const schemaStoreBeforeReread = deviceTab.schemaStore;
    deviceTab.schemaStore.setSlaveId('6');
    expect(deviceTab.isDirty).toBe(true);
    const showDiscardChangesModal = vi.fn(async () => false);

    await store.readRegisters(deviceTab, true, showDiscardChangesModal);

    expect(showDiscardChangesModal).toHaveBeenCalledTimes(1);
    expect(deviceTab.schemaStore).toBe(schemaStoreBeforeReread);
    expect(deviceTab.slaveId).toBe('6');
    expect(deviceTab.isDirty).toBe(true);
  });

  it('discards the unsaved settings of the device when the user accepts the confirmation', async () => {
    const { store, portTab } = makeStoreWithPort(makeDeviceTypesStore());
    const deviceTab = await addSelectedDeviceTab(store, portTab);
    deviceTab.schemaStore.setSlaveId('6');
    const showDiscardChangesModal = vi.fn(async () => true);

    await store.readRegisters(deviceTab, true, showDiscardChangesModal);

    expect(showDiscardChangesModal).toHaveBeenCalledTimes(1);
    expect(deviceTab.slaveId).toBe('5');
    expect(deviceTab.isDirty).toBeFalsy();
  });

  it('rereads without asking anything when nothing was edited', async () => {
    const { store, portTab } = makeStoreWithPort(makeDeviceTypesStore());
    const deviceTab = await addSelectedDeviceTab(store, portTab);
    const schemaStoreBeforeReread = deviceTab.schemaStore;
    const showDiscardChangesModal = vi.fn(async () => false);

    await store.readRegisters(deviceTab, true, showDiscardChangesModal);

    expect(showDiscardChangesModal).not.toHaveBeenCalled();
    // The forced reread rebuilds the settings editor from scratch
    expect(deviceTab.schemaStore).not.toBe(schemaStoreBeforeReread);
    expect(deviceTab.slaveId).toBe('5');
  });
});

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

const addDeviceTabWithType = async (
  store: ConfigEditorPageStore,
  portTab: PortTab,
  deviceType: string,
  slaveId: string,
) => {
  const deviceTab = store.createDeviceTab({ slave_id: slaveId, device_type: deviceType });
  store.tabs.addDeviceTab(portTab, deviceTab, false);
  await deviceTab.loadContent(portTab.baseConfig);
  return deviceTab;
};

describe('ConfigEditorPageStore template operation state', () => {
  it('startTemplateOperation sets pending flag and clears previous error', () => {
    const { store } = makeStoreWithPort(makeDeviceTypesStore());
    store.endTemplateOperation(new Error('old error'));
    expect(store.templateError).not.toBe('');

    store.startTemplateOperation();

    expect(store.templateOperationPending).toBe(true);
    expect(store.templateError).toBe('');
  });

  it('endTemplateOperation without error clears pending flag', () => {
    const { store } = makeStoreWithPort(makeDeviceTypesStore());
    store.startTemplateOperation();

    store.endTemplateOperation();

    expect(store.templateOperationPending).toBe(false);
    expect(store.templateError).toBe('');
  });

  it('endTemplateOperation with error clears pending flag and stores formatted error', () => {
    const { store } = makeStoreWithPort(makeDeviceTypesStore());
    store.startTemplateOperation();

    store.endTemplateOperation(new Error('upload failed'));

    expect(store.templateOperationPending).toBe(false);
    expect(store.templateError).toBe('upload failed');
  });

  it('clearTemplateError resets templateError to empty string', () => {
    const { store } = makeStoreWithPort(makeDeviceTypesStore());
    store.endTemplateOperation(new Error('some error'));
    expect(store.templateError).not.toBe('');

    store.clearTemplateError();

    expect(store.templateError).toBe('');
  });
});

describe('ConfigEditorPageStore.refreshDeviceTypeSchemas', () => {
  it('reloads schemas for device tabs matching the given types', async () => {
    const { store, portTab } = makeStoreWithPort(makeDeviceTypesStore());
    const deviceTab = await addDeviceTabWithType(store, portTab, 'wb-map12', '1');
    const schemaStoreBefore = deviceTab.schemaStore;

    await store.refreshDeviceTypeSchemas(new Set(['wb-map12']));

    expect(deviceTab.schemaStore).not.toBe(schemaStoreBefore);
  });

  it('does not reload schemas for device tabs whose type is not in the set', async () => {
    const { store, portTab } = makeStoreWithPort(makeDeviceTypesStore());
    const matchingTab = await addDeviceTabWithType(store, portTab, 'wb-map12', '1');
    const untouchedTab = await addDeviceTabWithType(store, portTab, 'wb-mdm3', '2');
    const matchingBefore = matchingTab.schemaStore;
    const untouchedBefore = untouchedTab.schemaStore;

    await store.refreshDeviceTypeSchemas(new Set(['wb-map12']));

    expect(matchingTab.schemaStore).not.toBe(matchingBefore);
    expect(untouchedTab.schemaStore).toBe(untouchedBefore);
  });
});
