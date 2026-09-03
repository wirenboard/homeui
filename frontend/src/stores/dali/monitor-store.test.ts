import { mqttClientMock } from '@/test/mocks/services';
import { FLUSH_INTERVAL_MS, MAX_MESSAGES, MonitorStore } from './monitor-store';

vi.mock('@/services', () => import('@/test/mocks/services'));

describe('MonitorStore', () => {
  let store: MonitorStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new MonitorStore();
  });

  describe('enableMonitoring', () => {
    test('subscribes and sets state', () => {
      store.enableMonitoring('bus1');
      expect(store.isEnabled).toBe(true);
      expect(store.isOnPause).toBe(false);
      expect(store.logs).toEqual([]);
      expect(mqttClientMock.addStickySubscription).toHaveBeenCalledWith(
        '/wb-dali/bus1/bus_monitor',
        expect.any(Function),
      );
    });
  });

  describe('disableMonitoring', () => {
    test('unsubscribes and clears state', () => {
      store.enableMonitoring('bus1');
      vi.clearAllMocks();

      store.disableMonitoring();
      expect(store.isEnabled).toBe(false);
      expect(store.logs).toEqual([]);
      expect(mqttClientMock.unsubscribe).toHaveBeenCalledWith('/wb-dali/bus1/bus_monitor');
    });

    test('does nothing if no topic', () => {
      store.disableMonitoring();
      expect(mqttClientMock.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('toggleLogsReception', () => {
    test('pauses when enabled', () => {
      store.enableMonitoring('bus1');
      vi.clearAllMocks();

      store.toggleLogsReception();
      expect(store.isOnPause).toBe(true);
      expect(mqttClientMock.unsubscribe).toHaveBeenCalled();
    });

    test('resumes when paused', () => {
      store.enableMonitoring('bus1');
      store.toggleLogsReception();
      vi.clearAllMocks();

      store.toggleLogsReception();
      expect(store.isOnPause).toBe(false);
      expect(mqttClientMock.addStickySubscription).toHaveBeenCalled();
    });

    test('does nothing when disabled', () => {
      store.toggleLogsReception();
      expect(store.isOnPause).toBe(false);
    });
  });

  describe('clearLogs', () => {
    test('empties logs array', () => {
      store.logs = ['a', 'b'];
      store.clearLogs();
      expect(store.logs).toEqual([]);
    });
  });

  describe('message handling', () => {
    // Incoming lines are batched and land in `logs` once per FLUSH_INTERVAL_MS.
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('appends trimmed messages after the flush interval', () => {
      store.enableMonitoring('bus1');
      const handler = mqttClientMock.addStickySubscription.mock.calls[0][1];
      handler({ payload: '  msg1  ' });
      handler({ payload: 'msg2\n' });
      expect(store.logs).toEqual([]);
      vi.advanceTimersByTime(FLUSH_INTERVAL_MS);
      expect(store.logs).toEqual(['msg1', 'msg2']);
    });

    test('caps at MAX_MESSAGES', () => {
      store.enableMonitoring('bus1');
      const handler = mqttClientMock.addStickySubscription.mock.calls[0][1];
      for (let i = 0; i < MAX_MESSAGES + 1; i++) {
        handler({ payload: `msg${i}` });
      }
      vi.advanceTimersByTime(FLUSH_INTERVAL_MS);
      expect(store.logs).toHaveLength(MAX_MESSAGES);
      expect(store.logs[0]).toBe('msg1');
      expect(store.logs[MAX_MESSAGES - 1]).toBe(`msg${MAX_MESSAGES}`);
    });

    test('totalAppended keeps counting past the cap, so derived row keys stay unique', () => {
      store.enableMonitoring('bus1');
      const handler = mqttClientMock.addStickySubscription.mock.calls[0][1];
      for (let i = 0; i < MAX_MESSAGES + 5; i++) {
        handler({ payload: `msg${i}` });
      }
      vi.advanceTimersByTime(FLUSH_INTERVAL_MS);
      expect(store.logs).toHaveLength(MAX_MESSAGES);
      expect(store.totalAppended).toBe(MAX_MESSAGES + 5);
    });
  });
});
