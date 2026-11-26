// @vitest-environment happy-dom
import { type DeviceTabStore, type DeviceTypesStore } from '@/stores/device-manager';
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

const makePortTab = (path: string) =>
  new PortTab(
    { path, enabled: true, baud_rate: 9600, parity: 'N', data_bits: 8, stop_bits: 2 },
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

const makeStoreWithTwoPorts = (deviceTypesStore: DeviceTypesStore) => {
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
  const portTab = makePortTab('/dev/ttyRS485-1');
  const targetPortTab = makePortTab('/dev/ttyRS485-2');
  store.tabs.addPortTab(portTab, true);
  store.tabs.addPortTab(targetPortTab, true);
  return { store, portTab, targetPortTab };
};

const addDeviceTab = async (store: ConfigEditorPageStore, portTab: PortTab, slaveId: string, selectTab = true) => {
  const deviceTab = store.createDeviceTab({ slave_id: slaveId });
  store.tabs.addDeviceTab(portTab, deviceTab, selectTab);
  await deviceTab.loadContent(portTab.baseConfig);
  return deviceTab;
};

describe('ConfigEditorPageStore.moveDevices single device (device tab entry point)', () => {
  it('moves the device to the chosen port, keeping its slave ID and content, and selects it', async () => {
    const { store, portTab, targetPortTab } = makeStoreWithTwoPorts(makeDeviceTypesStore());
    const deviceTab = await addDeviceTab(store, portTab, '5');
    deviceTab.schemaStore.setSlaveId('6');

    const showMoveDeviceModal = vi.fn(async () => new Map([[deviceTab, '/dev/ttyRS485-2']]));
    await store.moveDevices([deviceTab], showMoveDeviceModal, true);

    expect(portTab.children).not.toContain(deviceTab);
    expect(targetPortTab.children).toContain(deviceTab);
    expect(store.tabs.selectedTab).toBe(deviceTab);
    expect(deviceTab.slaveId).toBe('6');
  });

  it('leaves the device on its port when the move is cancelled', async () => {
    const { store, portTab } = makeStoreWithTwoPorts(makeDeviceTypesStore());
    const deviceTab = await addDeviceTab(store, portTab, '5');

    const showMoveDeviceModal = vi.fn(async () => null);
    await store.moveDevices([deviceTab], showMoveDeviceModal, true);

    expect(portTab.children).toContain(deviceTab);
  });
});

describe('ConfigEditorPageStore.moveDevices bulk move (port tab entry point)', () => {
  it('moves only the assigned devices and keeps the rest on the source port, without changing selection', async () => {
    const { store, portTab, targetPortTab } = makeStoreWithTwoPorts(makeDeviceTypesStore());
    const deviceA = await addDeviceTab(store, portTab, '5');
    const deviceB = await addDeviceTab(store, portTab, '6', false);
    store.tabs.selectTab(portTab);

    const showMoveDeviceModal = vi.fn(async () => new Map([[deviceA, '/dev/ttyRS485-2']]));
    await store.moveDevices(portTab.children.slice(), showMoveDeviceModal, false);

    expect(showMoveDeviceModal).toHaveBeenCalledWith([deviceA, deviceB]);
    expect(portTab.children).toEqual([deviceB]);
    expect(targetPortTab.children).toEqual([deviceA]);
    expect(store.tabs.selectedTab).toBe(portTab);
  });

  it('keeps the source port selected when moving its device to an earlier port (regression: index desync)',
    async () => {
      const { store, portTab, targetPortTab } = makeStoreWithTwoPorts(makeDeviceTypesStore());
      // targetPortTab sits before portTab in store.tabs.items, so inserting a device there shifts
      // every tab after it (including the selected portTab) without touching selectedTabIndex.
      const deviceA = await addDeviceTab(store, targetPortTab, '5');
      store.tabs.selectTab(targetPortTab);

      const showMoveDeviceModal = vi.fn(async () => new Map([[deviceA, portTab.path]]));
      await store.moveDevices(targetPortTab.children.slice(), showMoveDeviceModal, false);

      expect(portTab.children).toEqual([deviceA]);
      expect(targetPortTab.children).toEqual([]);
      expect(store.tabs.selectedTab).toBe(targetPortTab);
    });

  it('does nothing when no device is assigned to a port', async () => {
    const { store, portTab } = makeStoreWithTwoPorts(makeDeviceTypesStore());
    const deviceA = await addDeviceTab(store, portTab, '5');

    const showMoveDeviceModal = vi.fn(async () => new Map<DeviceTabStore, string>());
    await store.moveDevices(portTab.children.slice(), showMoveDeviceModal, false);

    expect(portTab.children).toEqual([deviceA]);
  });

  it('does nothing when there are no devices to move', async () => {
    const { store } = makeStoreWithTwoPorts(makeDeviceTypesStore());
    const showMoveDeviceModal = vi.fn();

    await store.moveDevices([], showMoveDeviceModal, false);

    expect(showMoveDeviceModal).not.toHaveBeenCalled();
  });
});
