import { mqttClientMock } from '@/test/mocks/services';
import { MonitorStore } from './monitor-store';

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
    test('appends trimmed messages', () => {
      store.enableMonitoring('bus1');
      const handler = mqttClientMock.addStickySubscription.mock.calls[0][1];
      handler({ payload: '  msg1  ' });
      handler({ payload: 'msg2\n' });
      expect(store.logs).toEqual(['msg1', 'msg2']);
    });

    test('caps at 500 messages', () => {
      store.enableMonitoring('bus1');
      const handler = mqttClientMock.addStickySubscription.mock.calls[0][1];
      for (let i = 0; i < 501; i++) {
        handler({ payload: `msg${i}` });
      }
      expect(store.logs).toHaveLength(500);
      expect(store.logs[0]).toBe('msg1');
      expect(store.logs[499]).toBe('msg500');
    });
  });
});
