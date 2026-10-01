import { logsProxy } from '@/services';
import LogsStore from './logs-store';

vi.mock('@/services', () => ({
  mqttClient: { whenReady: vi.fn(() => Promise.resolve()) },
  logsProxy: {
    List: vi.fn(),
    Load: vi.fn(),
    CancelLoad: vi.fn(() => Promise.resolve()),
  },
}));

describe('LogsStore', () => {
  let store: LogsStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new LogsStore();
  });

  test('initializes with empty state', () => {
    expect(store.logs).toEqual([]);
    expect(store.services).toEqual([]);
    expect(store.boots).toEqual([]);
    expect(store.isLoading).toBe(false);
  });

  test('loadServicesAndBoots populates services and boots', async () => {
    (logsProxy.List as any).mockResolvedValue({
      services: ['nginx', 'ssh'],
      boots: [{ id: '1' }],
    });
    await store.loadServicesAndBoots();
    expect(store.services).toEqual(['nginx', 'ssh']);
    expect(store.boots).toEqual([{ id: '1' }]);
  });

  test('loadLogs with filter change replaces logs', async () => {
    (logsProxy.Load as any).mockResolvedValue([
      { msg: 'log1' },
      { msg: 'log2' },
    ]);
    await store.loadLogs({ cursor: { direction: 'forward' } } as any, true);
    expect(store.logs).toHaveLength(2);
    expect(store.isLoading).toBe(false);
  });

  test('loadLogs forward appends logs', async () => {
    store.logs = [{ msg: 'existing' } as any];
    (logsProxy.Load as any).mockResolvedValue([
      { msg: 'new1' },
      { msg: 'new2' },
    ]);
    await store.loadLogs({ cursor: { direction: 'forward' } } as any);
    expect(store.logs.length).toBeGreaterThanOrEqual(2);
  });

  test('loadLogs backward prepends logs', async () => {
    store.logs = [{ msg: 'existing' } as any];
    (logsProxy.Load as any).mockResolvedValue([
      { msg: 'old1' },
      { msg: 'old2' },
    ]);
    const hasMore = await store.loadLogs({ cursor: { direction: 'backward' } } as any);
    expect(store.logs[0].msg).toBe('old2');
    expect(typeof hasMore).toBe('boolean');
  });

  test('loadLogs sets isLoading during request', async () => {
    let resolveLoad: any;
    (logsProxy.Load as any).mockReturnValue(new Promise((r) => {
      resolveLoad = r;
    }));

    const promise = store.loadLogs({ cursor: { direction: 'forward' } } as any, true);
    expect(store.isLoading).toBe(true);

    resolveLoad([]);
    await promise;
    expect(store.isLoading).toBe(false);
  });

  test('clearLogs empties array', () => {
    store.logs = [{ msg: 'x' } as any];
    store.clearLogs();
    expect(store.logs).toEqual([]);
  });

  test('cancelLoadLogs calls proxy', async () => {
    vi.useFakeTimers();
    const promise = store.cancelLoadLogs();
    await vi.advanceTimersByTimeAsync(1000);
    await promise;
    expect(logsProxy.CancelLoad).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
