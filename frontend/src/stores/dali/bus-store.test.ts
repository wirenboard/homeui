/* eslint-disable stylistic/max-len, max-lines */
import { daliProxyMock, mqttClientMock } from '@/test/mocks/services';
import { ItemType } from './base-item-store';
import { BusStore } from './bus-store';
import { DeviceStore } from './device-store';
import { GroupStore } from './group-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/json-schema-editor', () => import('@/test/mocks/json-schema-editor'));
vi.mock('@/utils/format-error', () => import('@/test/mocks/format-error'));

describe('BusStore', () => {
  let store: BusStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new BusStore('bus1', 'Bus 1');
  });

  describe('constructor', () => {
    test('sets id, label, and subscribes to commissioning', () => {
      expect(store.id).toBe('bus1');
      expect(store.label).toBe('Bus 1');
      expect(store.busMonitor).toBeDefined();
      expect(store.commands).toBeDefined();
      expect(mqttClientMock.addStickySubscription).toHaveBeenCalledWith(
        '/wb-dali/bus1/commissioning',
        expect.any(Function),
      );
    });

    test('accepts initial commissioning state', () => {
      const state = { status: 'binary_search' as const, progress: 50, error: null, device_count: 0, devices: null, finished_at: null };
      const s = new BusStore('bus2', 'Bus 2', state);
      expect(s.commissioningState.status).toBe('binary_search');
    });
  });

  describe('isScanning', () => {
    test('returns false when idle', () => {
      expect(store.isScanning).toBe(false);
    });

    test('returns true when scanStartRequested', () => {
      store.scanStartRequested = true;
      expect(store.isScanning).toBe(true);
    });

    test('returns true when status is active', () => {
      store.commissioningState = { ...store.commissioningState, status: 'binary_search' };
      expect(store.isScanning).toBe(true);
    });

    test.each(['idle', 'completed', 'failed', 'cancelled'] as const)(
      'returns false for terminal status %s',
      (status) => {
        store.commissioningState = { ...store.commissioningState, status };
        expect(store.isScanning).toBe(false);
      },
    );
  });

  describe('scan', () => {
    test('calls ScanBus and sets scanStartRequested', async () => {
      daliProxyMock.ScanBus.mockResolvedValue({ status: 'started' });

      await store.scan();

      expect(daliProxyMock.ScanBus).toHaveBeenCalledWith({ busId: 'bus1' });
      expect(store.error).toBeNull();
    });

    test('resets scanStartRequested on failure', async () => {
      daliProxyMock.ScanBus.mockRejectedValue(new Error('fail'));

      await store.scan();

      expect(store.scanStartRequested).toBe(false);
      expect(store.error).toBe('fail');
    });
  });

  describe('stopScan', () => {
    test('calls StopScanBus', async () => {
      daliProxyMock.StopScanBus.mockResolvedValue({ status: 'stopped' });

      await store.stopScan();

      expect(daliProxyMock.StopScanBus).toHaveBeenCalledWith({ busId: 'bus1' });
    });

    test('resets scanStopRequested on failure', async () => {
      daliProxyMock.StopScanBus.mockRejectedValue(new Error('fail'));

      await store.stopScan();

      expect(store.scanStopRequested).toBe(false);
      expect(store.error).toBe('fail');
    });
  });

  describe('setPollingInterval', () => {
    test('saves and updates value', async () => {
      daliProxyMock.SetBus.mockResolvedValue(undefined);

      await store.setPollingInterval(10);

      expect(store.pollingInterval).toBe(10);
      expect(daliProxyMock.SetBus).toHaveBeenCalledWith({
        busId: 'bus1',
        config: { polling_interval: 10 },
      });
    });

    test('sets error on failure', async () => {
      daliProxyMock.SetBus.mockRejectedValue(new Error('fail'));
      await store.setPollingInterval(10);
      expect(store.error).toBe('fail');
    });
  });

  describe('setBusMonitorEnabled', () => {
    test('updates and saves', async () => {
      daliProxyMock.SetBus.mockResolvedValue(undefined);

      await store.setBusMonitorEnabled(true);

      expect(store.busMonitorEnabled).toBe(true);
    });

    test('rolls back on failure', async () => {
      store.busMonitorEnabled = false;
      daliProxyMock.SetBus.mockRejectedValue(new Error('fail'));

      await store.setBusMonitorEnabled(true);

      expect(store.busMonitorEnabled).toBe(false);
      expect(store.error).toBe('fail');
    });
  });

  describe('load', () => {
    test('fetches bus data on first load', async () => {
      daliProxyMock.GetBus.mockResolvedValue({
        config: { polling_interval: 10, bus_monitor_enabled: true },
        schema: {},
        name: 'Bus Updated',
      });

      await store.load();

      expect(daliProxyMock.GetBus).toHaveBeenCalledWith({ busId: 'bus1' });
      expect(store.pollingInterval).toBe(10);
      expect(store.label).toBe('Bus Updated');
      expect(store.objectStore).toBeDefined();
      expect(store.isLoading).toBe(false);
    });

    test('skips if objectStore already exists', async () => {
      daliProxyMock.GetBus.mockResolvedValue({
        config: {},
        schema: {},
        name: '',
      });
      await store.load();
      vi.clearAllMocks();

      await store.load();

      expect(daliProxyMock.GetBus).not.toHaveBeenCalled();
    });

    test('sets isParametersSchemaLoading on subsequent loads', async () => {
      daliProxyMock.GetBus.mockResolvedValue({
        config: {},
        schema: {},
        name: '',
      });
      await store.load();
      store.objectStore = null;

      let capturedFlag = false;
      daliProxyMock.GetBus.mockImplementation(async () => {
        capturedFlag = store.isParametersSchemaLoading;
        return { config: {}, schema: {}, name: '' };
      });

      await store.load();

      expect(capturedFlag).toBe(true);
      expect(store.isParametersSchemaLoading).toBe(false);
    });

    test('sets error on failure', async () => {
      daliProxyMock.GetBus.mockRejectedValue(new Error('fail'));

      await store.load();

      expect(store.error).toBe('fail');
      expect(store.isLoading).toBe(false);
    });
  });

  describe('saveParam', () => {
    test('saves parameter and drops device caches', async () => {
      daliProxyMock.GetBus.mockResolvedValue({ config: {}, schema: {}, name: '' });
      await store.load();

      const paramMock = { store: { value: 42, commit: vi.fn() } };
      (vi.mocked(store.objectStore!.getParamByKey).mockReturnValue as any)(paramMock);
      daliProxyMock.SetBus.mockResolvedValue(undefined);

      const d1 = new DeviceStore('d1', 'D1', [1], store);
      d1.dropCache = vi.fn();
      store.children = [d1];

      await store.saveParam('brightness');

      expect(daliProxyMock.SetBus).toHaveBeenCalledWith({
        busId: 'bus1',
        config: { brightness: 42 },
      });
      expect(paramMock.store.commit).toHaveBeenCalled();
      expect(d1.dropCache).toHaveBeenCalled();
    });

    test('does nothing without objectStore', async () => {
      await store.saveParam('brightness');
      expect(daliProxyMock.SetBus).not.toHaveBeenCalled();
    });

    test('does nothing for unknown param', async () => {
      daliProxyMock.GetBus.mockResolvedValue({ config: {}, schema: {}, name: '' });
      await store.load();
      (vi.mocked(store.objectStore!.getParamByKey).mockReturnValue as any)(null);

      await store.saveParam('unknown');
      expect(daliProxyMock.SetBus).not.toHaveBeenCalled();
    });

    test('sets error on failure', async () => {
      daliProxyMock.GetBus.mockResolvedValue({ config: {}, schema: {}, name: '' });
      await store.load();
      (vi.mocked(store.objectStore!.getParamByKey).mockReturnValue as any)({ store: { value: 1 } });
      daliProxyMock.SetBus.mockRejectedValue(new Error('fail'));

      await store.saveParam('key');
      expect(store.error).toBe('fail');
    });
  });

  describe('commissioning handler', () => {
    function getCommissioningHandler() {
      const call = mqttClientMock.addStickySubscription.mock.calls.find(
        ([topic]: [string]) => topic === '/wb-dali/bus1/commissioning',
      );
      return call[1];
    }

    test('ignores empty payload', () => {
      const handler = getCommissioningHandler();
      handler({ payload: '' });
      expect(store.commissioningState.status).toBe('idle');
    });

    test('ignores invalid JSON', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const handler = getCommissioningHandler();
      handler({ payload: 'not-json' });
      expect(store.commissioningState.status).toBe('idle');
      consoleSpy.mockRestore();
    });

    test('applies valid commissioning state', () => {
      const handler = getCommissioningHandler();
      handler({
        payload: JSON.stringify({
          status: 'binary_search',
          progress: 50,
          error: null,
          device_count: 0,
          devices: null,
          finished_at: null,
        }),
      });
      expect(store.commissioningState.status).toBe('binary_search');
    });
  });

  describe('syncGroupChildren', () => {
    test('adds groups from device memberships', () => {
      store.children = [
        new DeviceStore('d1', 'D1', [0, 2], store),
        new DeviceStore('d2', 'D2', [2, 3], store),
      ];

      store.syncGroupChildren();

      const groupIndexes = store.children
        .filter((c) => c.type === ItemType.Group)
        .map((c) => (c as GroupStore).index);
      expect(groupIndexes).toEqual([0, 2, 3]);
    });

    test('removes groups with no device members', () => {
      store.children = [
        new DeviceStore('d1', 'D1', [1], store),
        new GroupStore('bus1_g1', 1, store),
        new GroupStore('bus1_g5', 5, store),
      ];

      store.syncGroupChildren();

      const groupIndexes = store.children
        .filter((c) => c.type === ItemType.Group)
        .map((c) => (c as GroupStore).index);
      expect(groupIndexes).toEqual([1]);
    });

    test('sorts devices before groups, groups by index', () => {
      store.children = [
        new DeviceStore('d1', 'D1', [2, 0], store),
      ];

      store.syncGroupChildren();

      const types = store.children.map((c) => c.type);
      expect(types[0]).toBe(ItemType.Device);
      expect(types.slice(1).every((t) => t === 'group')).toBe(true);
    });
  });

  describe('applyCommissioningState', () => {
    test('updates state and resets scan flags', async () => {
      store.scanStartRequested = true;
      store.scanStopRequested = true;

      await store.applyCommissioningState({
        status: 'binary_search',
        progress: 30,
        error: null,
        device_count: 0,
        devices: null,
        finished_at: null,
      });

      expect(store.commissioningState.status).toBe('binary_search');
      expect(store.scanStartRequested).toBe(false);
      expect(store.scanStopRequested).toBe(false);
    });

    test('rebuilds children on completed', async () => {
      daliProxyMock.GetBus.mockResolvedValue({
        config: {},
        schema: {},
        name: 'Bus 1',
      });

      await store.applyCommissioningState({
        status: 'completed',
        progress: 100,
        error: null,
        device_count: 2,
        devices: [
          { id: 'dev1', name: 'Lamp', groups: [1] },
          { id: 'dev2', name: 'Fan', groups: [1, 2] },
        ],
        finished_at: '2026-01-01',
      });

      const deviceIds = store.children
        .filter((c) => c.type === ItemType.Device)
        .map((c) => c.id);
      expect(deviceIds).toEqual(['dev1', 'dev2']);
    });
  });

  describe('destroy', () => {
    test('unsubscribes from commissioning', () => {
      store.destroy();
      expect(mqttClientMock.unsubscribe).toHaveBeenCalledWith('/wb-dali/bus1/commissioning');
    });
  });

  describe('dropDeviceCaches', () => {
    test('drops caches for all devices', () => {
      const d1 = new DeviceStore('d1', 'D1', [1], store);
      const d2 = new DeviceStore('d2', 'D2', [2], store);
      d1.dropCache = vi.fn();
      d2.dropCache = vi.fn();
      store.children = [d1, d2];

      store.dropDeviceCaches();

      expect(d1.dropCache).toHaveBeenCalled();
      expect(d2.dropCache).toHaveBeenCalled();
    });

    test('drops caches only for devices in specified group', () => {
      const d1 = new DeviceStore('d1', 'D1', [1], store);
      const d2 = new DeviceStore('d2', 'D2', [2], store);
      d1.dropCache = vi.fn();
      d2.dropCache = vi.fn();
      store.children = [d1, d2];

      store.dropDeviceCaches(1);

      expect(d1.dropCache).toHaveBeenCalled();
      expect(d2.dropCache).not.toHaveBeenCalled();
    });
  });
});
