// @vitest-environment happy-dom
vi.mock('@/services', () => import('@/test/mocks/services'));

import { logsProxyMock, mqttClientMock } from '@/test/mocks/services';
import LogsStore from './logs-store';
import type { Log } from './types';

function makeLog(overrides: Partial<Log> = {}): Log {
  return {
    time: 1700000000000,
    level: 6,
    msg: 'Test',
    service: 'svc',
    cursor: 'c1',
    ...overrides,
  } as Log;
}

describe('LogsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mqttClientMock.whenReady.mockResolvedValue(undefined);
  });

  test('initializes with empty state', () => {
    const store = new LogsStore();
    expect(store.logs).toEqual([]);
    expect(store.services).toEqual([]);
    expect(store.boots).toEqual([]);
    expect(store.isLoading).toBe(false);
  });

  describe('loadServicesAndBoots', () => {
    test('populates services and boots', async () => {
      logsProxyMock.List.mockResolvedValue({
        services: ['svc-a', 'svc-b'],
        boots: [{ hash: 'h1', start: 1700000000 }],
      });
      const store = new LogsStore();
      await store.loadServicesAndBoots();
      expect(store.services).toEqual(['svc-a', 'svc-b']);
      expect(store.boots).toHaveLength(1);
      expect(store.boots[0].hash).toBe('h1');
    });

    test('waits for mqtt connection', async () => {
      logsProxyMock.List.mockResolvedValue({ services: [], boots: [] });
      const store = new LogsStore();
      await store.loadServicesAndBoots();
      expect(mqttClientMock.whenReady).toHaveBeenCalled();
    });

    test('propagates error', async () => {
      logsProxyMock.List.mockRejectedValue(new Error('net'));
      const store = new LogsStore();
      await expect(store.loadServicesAndBoots()).rejects.toThrow('net');
    });
  });

  describe('loadLogs', () => {
    test('replaces logs on filter change', async () => {
      logsProxyMock.Load.mockResolvedValue([makeLog({ msg: 'a' }), makeLog({ msg: 'b' })]);
      const store = new LogsStore();
      const hasMore = await store.loadLogs({}, true);
      expect(store.logs).toHaveLength(2);
      expect(hasMore).toBe(true);
    });

    test('returns false for empty filter result', async () => {
      logsProxyMock.Load.mockResolvedValue([]);
      const store = new LogsStore();
      expect(await store.loadLogs({}, true)).toBe(false);
    });

    test('reverses log order', async () => {
      logsProxyMock.Load.mockResolvedValue([makeLog({ msg: 'first' }), makeLog({ msg: 'second' })]);
      const store = new LogsStore();
      await store.loadLogs({}, true);
      expect(store.logs[0].msg).toBe('second');
      expect(store.logs[1].msg).toBe('first');
    });

    test('prepends older logs for backward cursor', async () => {
      logsProxyMock.Load.mockResolvedValue([makeLog({ msg: 'A' })]);
      const store = new LogsStore();
      await store.loadLogs({}, true);

      logsProxyMock.Load.mockResolvedValue([makeLog({ msg: 'A' }), makeLog({ msg: 'C' })]);
      const hasMore = await store.loadLogs({ cursor: { direction: 'backward', id: 'c1' } });
      expect(store.logs[0].msg).toBe('C');
      expect(store.logs).toHaveLength(2);
      expect(hasMore).toBe(true);
    });

    test('returns false for backward with no new logs', async () => {
      logsProxyMock.Load.mockResolvedValue([makeLog({ msg: 'A' })]);
      const store = new LogsStore();
      await store.loadLogs({}, true);

      logsProxyMock.Load.mockResolvedValue([makeLog({ msg: 'A' })]);
      const hasMore = await store.loadLogs({ cursor: { direction: 'backward', id: 'c1' } });
      expect(hasMore).toBe(false);
    });

    test('appends newer logs for forward cursor', async () => {
      logsProxyMock.Load.mockResolvedValue([makeLog({ msg: 'A' })]);
      const store = new LogsStore();
      await store.loadLogs({}, true);

      logsProxyMock.Load.mockResolvedValue([makeLog({ msg: 'B' }), makeLog({ msg: 'A' })]);
      await store.loadLogs({ cursor: { direction: 'forward', id: 'c1' } });
      expect(store.logs).toHaveLength(2);
      expect(store.logs.at(-1)!.msg).toBe('B');
    });

    test('passes limit to proxy', async () => {
      logsProxyMock.Load.mockResolvedValue([]);
      const store = new LogsStore();
      await store.loadLogs({ service: 'x' }, true);
      expect(logsProxyMock.Load).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, service: 'x' }),
      );
    });

    test('sets isLoading during load', async () => {
      let resolveLoad!: (v: any) => void;
      logsProxyMock.Load.mockReturnValue(new Promise((r) => {
        resolveLoad = r;
      }));
      const store = new LogsStore();
      const promise = store.loadLogs({}, true);
      expect(store.isLoading).toBe(true);
      resolveLoad([]);
      await promise;
      expect(store.isLoading).toBe(false);
    });

    test('resets isLoading on error', async () => {
      logsProxyMock.Load.mockRejectedValue(new Error('fail'));
      const store = new LogsStore();
      await expect(store.loadLogs({}, true)).rejects.toThrow();
      expect(store.isLoading).toBe(false);
    });

    test('cancels previous load if already loading', async () => {
      vi.useFakeTimers();
      logsProxyMock.CancelLoad.mockResolvedValue(undefined);
      logsProxyMock.Load.mockResolvedValue([]);
      const store = new LogsStore();
      store.isLoading = true;
      const promise = store.loadLogs({}, true);
      await vi.advanceTimersByTimeAsync(1000);
      await promise;
      expect(logsProxyMock.CancelLoad).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('cancelLoadLogs', () => {
    test('calls CancelLoad on proxy', async () => {
      vi.useFakeTimers();
      logsProxyMock.CancelLoad.mockResolvedValue(undefined);
      const store = new LogsStore();
      const promise = store.cancelLoadLogs();
      await vi.advanceTimersByTimeAsync(1000);
      await promise;
      expect(logsProxyMock.CancelLoad).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('clearLogs', () => {
    test('empties logs array', async () => {
      logsProxyMock.Load.mockResolvedValue([makeLog()]);
      const store = new LogsStore();
      await store.loadLogs({}, true);
      expect(store.logs).toHaveLength(1);
      store.clearLogs();
      expect(store.logs).toEqual([]);
    });
  });
});
