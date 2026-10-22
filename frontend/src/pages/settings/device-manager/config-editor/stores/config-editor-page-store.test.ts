// @vitest-environment happy-dom
import { DeviceTabStore, type DeviceTypesStore } from '@/stores/device-manager';
import type { ScannedDevice } from '@/stores/device-manager/types';
import { Translator, type JsonSchema } from '@/stores/json-schema-editor';
import { ConfigEditorPageStore } from './config-editor-page-store';
import { PortTab, makeSerialPortTabName } from './port-tab-store';
import { TabType } from './tabs-store';

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

describe('ConfigEditorPageStore template operation state', () => {
  it('startTemplateOperation sets pending flag', () => {
    const { store } = makeStoreWithPort(makeDeviceTypesStore());

    store.startTemplateOperation();

    expect(store.templateOperationPending).toBe(true);
  });

  it('endTemplateOperation clears pending flag', () => {
    const { store } = makeStoreWithPort(makeDeviceTypesStore());
    store.startTemplateOperation();

    store.endTemplateOperation();

    expect(store.templateOperationPending).toBe(false);
  });
});

describe('ConfigEditorPageStore template affected types and success message', () => {
  it('startTemplateOperation clears templateAffectedTypes and templateSuccessMessage', () => {
    const { store } = makeStoreWithPort(makeDeviceTypesStore());
    store.setTemplateAffectedTypes(new Set(['wb-map12']));
    store.setTemplateSuccessMessage('done');

    store.startTemplateOperation();

    expect(store.templateAffectedTypes.size).toBe(0);
    expect(store.templateSuccessMessage).toBe('');
  });

  it('clearTemplateSuccessMessage resets templateSuccessMessage to an empty string', () => {
    const { store } = makeStoreWithPort(makeDeviceTypesStore());
    store.setTemplateSuccessMessage('done');

    store.clearTemplateSuccessMessage();

    expect(store.templateSuccessMessage).toBe('');
  });
});

describe('ConfigEditorPageStore template warning', () => {
  it('setTemplateWarning sets the templateWarning text', () => {
    const { store } = makeStoreWithPort(makeDeviceTypesStore());

    store.setTemplateWarning('unsaved changes');

    expect(store.templateWarning).toBe('unsaved changes');
  });

  it('clearTemplateWarning resets templateWarning to an empty string', () => {
    const { store } = makeStoreWithPort(makeDeviceTypesStore());
    store.setTemplateWarning('unsaved changes');

    store.clearTemplateWarning();

    expect(store.templateWarning).toBe('');
  });

  it('startTemplateOperation clears a pending templateWarning', () => {
    const { store } = makeStoreWithPort(makeDeviceTypesStore());
    store.setTemplateWarning('unsaved changes');

    store.startTemplateOperation();

    expect(store.templateWarning).toBe('');
  });

  it('save clears the templateWarning once the configuration is saved successfully', async () => {
    const { store } = makeStoreWithPort(makeDeviceTypesStore());
    store.setTemplateWarning('unsaved changes');

    await store.save();

    expect(store.templateWarning).toBe('');
  });

  it('save leaves the templateWarning in place when saving fails', async () => {
    const { store } = makeStoreWithPort(makeDeviceTypesStore());
    store.saveConfigFn = async () => {
      throw new Error('write failed');
    };
    store.setTemplateWarning('unsaved changes');

    await store.save();

    expect(store.templateWarning).toBe('unsaved changes');
    expect(store.error).not.toBe('');
  });
});

describe('ConfigEditorPageStore.reload', () => {
  const makeReplacementPortTab = (store: ConfigEditorPageStore) => {
    const newPortTab = new PortTab(
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
    newPortTab.addChildren(store.createDeviceTab({ slave_id: '5' }));
    return newPortTab;
  };

  it('restores the previously selected tab position and reloads the new device tab there', async () => {
    const { store, portTab } = makeStoreWithPort(makeDeviceTypesStore());
    await addSelectedDeviceTab(store, portTab);
    const selectedIndexBeforeReload = store.tabs.selectedTabIndex;
    vi.spyOn(store, 'load').mockImplementation(async () => {
      store.tabs.addPortTab(makeReplacementPortTab(store), true);
    });
    const loadContentSpy = vi.spyOn(DeviceTabStore.prototype, 'loadContent');

    await store.reload();

    expect(store.tabs.selectedTabIndex).toBe(selectedIndexBeforeReload);
    const restoredTab = store.tabs.selectedTab as DeviceTabStore;
    expect(restoredTab.type).toBe(TabType.Device);
    expect(loadContentSpy.mock.instances).toContain(restoredTab);

    loadContentSpy.mockRestore();
  });

  it('does not try to restore a selection when the reloaded config has no tabs', async () => {
    const { store, portTab } = makeStoreWithPort(makeDeviceTypesStore());
    await addSelectedDeviceTab(store, portTab);
    vi.spyOn(store, 'load').mockImplementation(async () => {
      store.tabs.clear();
    });

    await expect(store.reload()).resolves.toBeUndefined();
    expect(store.tabs.items).toHaveLength(0);
  });
});

describe('ConfigEditorPageStore.load config-busy retry', () => {
  const configBusyError = { code: -32000, data: 'config-busy', message: 'Server error' };

  const successResult = () => ({
    config: { ports: [] } as any,
    schema: { definitions: {}, properties: {} } as any,
    deviceTypeGroups: [],
  });

  const makeStoreWithLoadConfigFn = (loadConfigFn: () => Promise<any>) =>
    new ConfigEditorPageStore(
      loadConfigFn,
      async () => {},
      () => {},
      () => {},
      { setDeviceTypeGroups: vi.fn() } as unknown as DeviceTypesStore,
      {} as any,
      {} as any,
      {} as any,
    );

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries loading on config-busy with escalating delays and recovers once it succeeds', async () => {
    const loadConfigFn = vi.fn()
      .mockRejectedValueOnce(configBusyError)
      .mockRejectedValueOnce(configBusyError)
      .mockResolvedValueOnce(successResult());
    const store = makeStoreWithLoadConfigFn(loadConfigFn);

    const loadPromise = store.load();
    expect(loadConfigFn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(loadConfigFn).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(2000);
    expect(loadConfigFn).toHaveBeenCalledTimes(3);

    await loadPromise;
    expect(store.loading).toBe(false);
    expect(store.error).toBe('');
  });

  it('gives up after the max retry count and surfaces a translated config-busy error', async () => {
    const loadConfigFn = vi.fn().mockRejectedValue(configBusyError);
    const store = makeStoreWithLoadConfigFn(loadConfigFn);

    const loadPromise = store.load();
    await vi.advanceTimersByTimeAsync(300 * 1000);
    await loadPromise;

    expect(loadConfigFn).toHaveBeenCalledTimes(31);
    expect(store.loading).toBe(false);
    expect(store.error).toBe('The configuration is being saved, try again later');
  });
});
