// @vitest-environment happy-dom
const { makeParamsMock } = vi.hoisted(() => ({
  makeParamsMock: vi.fn(),
}));

vi.mock('@/common/paths', () => ({ mbgatePath: '/mbgate' }));
vi.mock('@/components/json-editor/forms', () => ({
  makeParameterStoreFromJsonSchema: makeParamsMock,
}));

import { MbGateStore } from './page-store';
import type { AllRegisters, Register } from './types';

function makeParamsStore(
  registers: AllRegisters = { coils: [], discretes: [], holdings: [], inputs: [] },
) {
  return {
    value: { registers },
    params: {
      registers: { setValue: vi.fn() },
      mqtt: {
        params: {
          keepalive: { setStrict: vi.fn(), setDefaultText: vi.fn() },
        },
      },
    },
    isDirty: false,
    hasErrors: false,
    setValue: vi.fn(),
    submit: vi.fn(),
  };
}

function makeConfigsStore() {
  return {
    getConfig: vi.fn().mockResolvedValue(undefined),
    config: { schema: {}, content: {} },
    saveConfig: vi.fn().mockResolvedValue(undefined),
  };
}

function makeDevicesStore(
  cells: Record<string, { type: string; readOnly: boolean }> = {},
  filteredDevices: [string, { cells: Set<string> }][] = [],
) {
  return {
    cells: new Map(Object.entries(cells)),
    filteredDevices: new Map(filteredDevices),
  };
}

function makeReg(overrides: Partial<Register> = {}): Register {
  return { topic: 'dev/ctrl', address: 1, enabled: true, unitId: 1, ...overrides };
}

describe('MbGateStore', () => {
  let configsStore: ReturnType<typeof makeConfigsStore>;
  let devicesStore: ReturnType<typeof makeDevicesStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    configsStore = makeConfigsStore();
    devicesStore = makeDevicesStore();
  });

  test('initializes with null error', () => {
    const store = new MbGateStore(configsStore as any, devicesStore as any);
    expect(store.error).toBeNull();
  });

  describe('loadData', () => {
    test('calls getConfig and sets up paramsStore', async () => {
      const ps = makeParamsStore();
      makeParamsMock.mockReturnValue(ps);
      configsStore.config = { schema: { type: 'object' }, content: { val: 1 } };

      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.loadData();

      await vi.waitFor(() => expect(makeParamsMock).toHaveBeenCalledWith({ type: 'object' }));
      expect(ps.setValue).toHaveBeenCalledWith({ val: 1 });
      expect(ps.submit).toHaveBeenCalled();
    });
  });

  describe('save', () => {
    test('saves and clears error on success', async () => {
      const ps = makeParamsStore();
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = ps;

      await store.save();

      expect(configsStore.saveConfig).toHaveBeenCalledWith(ps.value);
      expect(store.error).toBeNull();
      expect(ps.submit).toHaveBeenCalled();
    });

    test('sets error on failure', async () => {
      configsStore.saveConfig.mockRejectedValue(new Error('save failed'));
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = makeParamsStore();

      await store.save();

      expect(store.error).toBe('save failed');
    });
  });

  describe('getConfiguredControls', () => {
    test('returns topics from all register types', () => {
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = makeParamsStore({
        coils: [makeReg({ topic: '/a' })],
        discretes: [makeReg({ topic: '/b' })],
        holdings: [],
        inputs: [makeReg({ topic: '/c' })],
      });
      expect(store.getConfiguredControls()).toEqual(['/a', '/b', '/c']);
    });

    test('returns empty array when no registers', () => {
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = makeParamsStore();
      expect(store.getConfiguredControls()).toEqual([]);
    });
  });

  describe('addControls', () => {
    test('does nothing for empty array', () => {
      const ps = makeParamsStore();
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = ps;
      store.addControls([]);
      expect(ps.params.registers.setValue).not.toHaveBeenCalled();
    });

    test('adds switch type as coil', () => {
      devicesStore = makeDevicesStore({ 'dev/sw': { type: 'switch', readOnly: false } });
      const ps = makeParamsStore();
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = ps;

      store.addControls(['dev/sw']);

      const regs = ps.params.registers.setValue.mock.calls[0][0];
      expect(regs.coils).toHaveLength(1);
      expect(regs.coils[0].topic).toBe('dev/sw');
    });

    test('adds pushbutton type as coil', () => {
      devicesStore = makeDevicesStore({ 'dev/pb': { type: 'pushbutton', readOnly: false } });
      const ps = makeParamsStore();
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = ps;

      store.addControls(['dev/pb']);

      const regs = ps.params.registers.setValue.mock.calls[0][0];
      expect(regs.coils).toHaveLength(1);
    });

    test('adds readOnly switch as discrete', () => {
      devicesStore = makeDevicesStore({ 'dev/sw': { type: 'switch', readOnly: true } });
      const ps = makeParamsStore();
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = ps;

      store.addControls(['dev/sw']);

      const regs = ps.params.registers.setValue.mock.calls[0][0];
      expect(regs.discretes).toHaveLength(1);
      expect(regs.coils).toHaveLength(0);
    });

    test('adds numeric type as holding with signed format', () => {
      devicesStore = makeDevicesStore({ 'dev/t': { type: 'temperature', readOnly: false } });
      const ps = makeParamsStore();
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = ps;

      store.addControls(['dev/t']);

      const regs = ps.params.registers.setValue.mock.calls[0][0];
      expect(regs.holdings).toHaveLength(1);
      expect(regs.holdings[0].format).toBe('signed');
      expect(regs.holdings[0].size).toBe(2);
    });

    test('adds readOnly numeric as input', () => {
      devicesStore = makeDevicesStore({ 'dev/t': { type: 'temperature', readOnly: true } });
      const ps = makeParamsStore();
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = ps;

      store.addControls(['dev/t']);

      const regs = ps.params.registers.setValue.mock.calls[0][0];
      expect(regs.inputs).toHaveLength(1);
      expect(regs.holdings).toHaveLength(0);
    });

    test('adds text type with varchar format', () => {
      devicesStore = makeDevicesStore({ 'dev/txt': { type: 'text', readOnly: false } });
      const ps = makeParamsStore();
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = ps;

      store.addControls(['dev/txt']);

      const regs = ps.params.registers.setValue.mock.calls[0][0];
      expect(regs.holdings).toHaveLength(1);
      expect(regs.holdings[0].format).toBe('varchar');
      expect(regs.holdings[0].size).toBe(1);
    });

    test('merges with existing registers', () => {
      devicesStore = makeDevicesStore({ 'dev/new': { type: 'switch', readOnly: false } });
      const existing = makeReg({ topic: 'dev/old', address: 10, unitId: 3 });
      const ps = makeParamsStore({
        coils: [existing], discretes: [], holdings: [], inputs: [],
      });
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = ps;

      store.addControls(['dev/new']);

      const regs = ps.params.registers.setValue.mock.calls[0][0];
      expect(regs.coils).toHaveLength(2);
      expect(regs.coils[0]).toEqual(existing);
      expect(regs.coils[1].topic).toBe('dev/new');
    });
  });

  describe('checkAllControlsConfigured', () => {
    test('returns false when no value', () => {
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = { value: null };
      expect(store.checkAllControlsConfigured()).toBe(false);
    });

    test('returns true when all cells configured', () => {
      devicesStore = makeDevicesStore({}, [
        ['dev1', { cells: new Set(['dev1/c1']) }],
      ]);
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = makeParamsStore({
        coils: [makeReg({ topic: 'dev1/c1' })],
        discretes: [], holdings: [], inputs: [],
      });
      expect(store.checkAllControlsConfigured()).toBe(true);
    });

    test('returns false when some cells not configured', () => {
      devicesStore = makeDevicesStore({}, [
        ['dev1', { cells: new Set(['dev1/c1', 'dev1/c2']) }],
      ]);
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = makeParamsStore({
        coils: [makeReg({ topic: 'dev1/c1' })],
        discretes: [], holdings: [], inputs: [],
      });
      expect(store.checkAllControlsConfigured()).toBe(false);
    });
  });

  describe('computed', () => {
    test('isDirty delegates to paramsStore', () => {
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = makeParamsStore();
      expect(store.isDirty).toBe(false);
      store.paramsStore = { ...makeParamsStore(), isDirty: true };
      expect(store.isDirty).toBe(true);
    });

    test('allowSave requires isDirty and no errors', () => {
      const store = new MbGateStore(configsStore as any, devicesStore as any);
      store.paramsStore = makeParamsStore();
      expect(store.allowSave).toBe(false);

      store.paramsStore = { ...makeParamsStore(), isDirty: true };
      expect(store.allowSave).toBe(true);

      store.paramsStore = { ...makeParamsStore(), isDirty: true, hasErrors: true };
      expect(store.allowSave).toBe(false);
    });
  });
});
