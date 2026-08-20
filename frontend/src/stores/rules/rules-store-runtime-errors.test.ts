// Runtime errors from the rule console: recording, attribution, filtering
// and clearing (moved here from rules-store.test.ts so the pre-existing
// store tests stay untouched).
import { editorProxyMock, mqttClientMock } from '@/test/mocks/services';
import RulesStore from './rules-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/utils/id', () => import('@/test/mocks/utils-id'));

describe('runtime errors from the rule console', () => {
  const WRITE_IGNORED = 'control buzzer/enabled: write ignored (bad) at /etc/wb-rules/buzz.js:14';
  let store: RulesStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new RulesStore();
  });

  test('keeps one entry per line when the message text changes (value in the message)', () => {
    store.recordRuntimeError('control a/b: write ignored (value 1) at /etc/wb-rules/buzz.js:14', 1);
    store.recordRuntimeError('control a/b: write ignored (value 2) at /etc/wb-rules/buzz.js:14', 2);
    expect(store.runtimeErrors).toHaveLength(1);
    expect(store.runtimeErrors[0])
      .toMatchObject({ line: 14, count: 2, message: 'control a/b: write ignored (value 2)' });
  });

  test('attributes a throw inside lib.js or a module to the innermost rule frame', () => {
    store.recordRuntimeError(
      'ECMAScript error: Error: invalid cell reference\n'
      + '    at f (/usr/share/wb-rules-system/scripts/lib.js:136)\n'
      + '    at then (/etc/wb-rules/foo.js:10)\n'
      + '    at <anonymous> (/usr/share/wb-rules-system/scripts/lib.js:200)',
      1,
    );
    expect(store.runtimeErrors).toEqual([
      {
        path: '/etc/wb-rules/foo.js',
        line: 10,
        message: 'ECMAScript error: Error: invalid cell reference',
        count: 1,
        lastSeen: 1,
      },
    ]);
    expect(store.runtimeErrorsFor('foo.js')).toHaveLength(1);
  });

  test('records an attributed error once per place and counts repeats', () => {
    store.recordRuntimeError(WRITE_IGNORED, 1000);
    store.recordRuntimeError(WRITE_IGNORED, 2000);
    store.recordRuntimeError('ECMAScript error: TypeError: boom\n    at F (/etc/wb-rules/buzz.js:3)', 3000);
    expect(store.runtimeErrors).toEqual([
      {
        path: '/etc/wb-rules/buzz.js',
        line: 14,
        message: 'control buzzer/enabled: write ignored (bad)',
        count: 2,
        lastSeen: 2000,
      },
      {
        path: '/etc/wb-rules/buzz.js',
        line: 3,
        message: 'ECMAScript error: TypeError: boom',
        count: 1,
        lastSeen: 3000,
      },
    ]);
  });

  test('ignores messages without a location', () => {
    store.recordRuntimeError('control a/b: write ignored (no location here)');
    expect(store.runtimeErrors).toEqual([]);
  });

  test('filters by the open rule and clears per file (save, controller reload)', () => {
    store.recordRuntimeError(WRITE_IGNORED, 1);
    store.recordRuntimeError('x at /etc/wb-rules/other.js:2', 1);
    store.recordRuntimeError('y at /etc/wb-rules/sub/buzz.js:5', 1);
    expect(store.runtimeErrorsFor('buzz.js').map((e) => e.line)).toEqual([14]);
    expect(store.runtimeErrorsFor('sub/buzz.js').map((e) => e.line)).toEqual([5]);
    store.clearRuntimeErrorsFor('buzz.js');
    expect(store.runtimeErrors.map((e) => e.path)).toEqual(['/etc/wb-rules/other.js', '/etc/wb-rules/sub/buzz.js']);
    store.clearRuntimeErrorsFor('');
    expect(store.runtimeErrors).toHaveLength(2);
  });

  test('load and save track the content that runs on the controller', async () => {
    editorProxyMock.Load.mockResolvedValue({ content: 'v1', enabled: true });
    await store.load('buzz.js');
    expect(store.runningContent).toBe('v1');
    store.recordRuntimeError(WRITE_IGNORED, 1);
    store.setRule('v2');
    editorProxyMock.Save.mockResolvedValue({ path: 'buzz.js' });
    await store.save(store.rule);
    expect(store.runningContent).toBe('v2');
    // the previous version's errors are obsolete once the file is re-saved
    expect(store.runtimeErrorsFor('buzz.js')).toEqual([]);
  });

  test('is bounded: the oldest entry makes room for a new one', () => {
    for (let i = 0; i < 200; i++) {
      store.recordRuntimeError(`e at /etc/wb-rules/f${i}.js:1`, i + 10);
    }
    store.recordRuntimeError('e at /etc/wb-rules/new.js:1', 5000);
    expect(store.runtimeErrors).toHaveLength(200);
    expect(store.runtimeErrors.some((e) => e.path === '/etc/wb-rules/f0.js')).toBe(false);
    expect(store.runtimeErrors.some((e) => e.path === '/etc/wb-rules/new.js')).toBe(true);
  });

  test('subscribes to console errors (error level only) and clears stale errors on a controller-side reload', () => {
    vi.useFakeTimers();
    vi.setSystemTime(100000);
    store.subscribeRulesLogs();
    const calls = mqttClientMock.addStickySubscription.mock.calls;
    const logHandler = calls.find((c) => c[0] === '/wbrules/log/+')[1];
    const changedHandler = calls.find((c) => c[0] === '/wbrules/updates/changed')[1];
    logHandler({ topic: '/wbrules/log/error', payload: WRITE_IGNORED + '\n' });
    logHandler({ topic: '/wbrules/log/warning', payload: 'w at /etc/wb-rules/buzz.js:1' });
    expect(store.runtimeErrorsFor('buzz.js')).toHaveLength(1);
    // long after the old version's error, the file is reloaded externally:
    // the notification arrives with no fresh errors - everything recorded
    // for the file described the replaced version and is cleared
    vi.setSystemTime(160000);
    changedHandler({ topic: '/wbrules/updates/changed', payload: 'buzz.js' });
    expect(store.runtimeErrorsFor('buzz.js')).toEqual([]);
    vi.useRealTimers();
  });
});

// The engine loads the new version of a file BEFORE it publishes
// /wbrules/updates/changed (same ordered MQTT connection), so an error the
// new version logs while loading arrives just before the notification.
describe('external reloads (scp, another tab, an engine restart)', () => {
  let store: RulesStore;
  let logHandler: (msg: { topic: string; payload: string }) => void;
  let changedHandler: (msg: { topic: string; payload: string }) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new RulesStore();
    store.subscribeRulesLogs();
    const calls = mqttClientMock.addStickySubscription.mock.calls;
    logHandler = calls.find((c) => c[0] === '/wbrules/log/+')[1];
    changedHandler = calls.find((c) => c[0] === '/wbrules/updates/changed')[1];
  });

  test('an error logged by the version being loaded survives the changed that follows; older ones clear', () => {
    vi.useFakeTimers();
    vi.setSystemTime(100000);
    logHandler({ topic: '/wbrules/log/error', payload: 'old at /etc/wb-rules/buzz.js:3' });
    // a minute later the file is replaced over scp; the engine runs the new
    // version (logging its load-time error) and publishes changed right after
    vi.setSystemTime(160000);
    logHandler({ topic: '/wbrules/log/error', payload: 'boom at /etc/wb-rules/buzz.js:7' });
    changedHandler({ topic: '/wbrules/updates/changed', payload: 'buzz.js' });
    expect(store.runtimeErrorsFor('buzz.js').map((e) => e.line)).toEqual([7]);
    vi.useRealTimers();
  });

  test('an external reload of the open rule re-anchors runningContent, leaving the editing buffer alone', async () => {
    editorProxyMock.Load.mockResolvedValue({ content: 'v1', enabled: true });
    await store.load('buzz.js');
    expect(store.runningContent).toBe('v1');
    editorProxyMock.Load.mockResolvedValue({ content: 'v2 from scp', enabled: true });
    changedHandler({ topic: '/wbrules/updates/changed', payload: 'buzz.js' });
    await vi.waitFor(() => expect(store.runningContent).toBe('v2 from scp'));
    // the editing buffer was not touched
    expect(store.rule.content).toBe('v1');
  });

  test('a reload of some other file does not touch the open rule and asks the engine nothing', async () => {
    editorProxyMock.Load.mockResolvedValue({ content: 'v1', enabled: true });
    await store.load('buzz.js');
    editorProxyMock.Load.mockClear();
    changedHandler({ topic: '/wbrules/updates/changed', payload: 'other.js' });
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(editorProxyMock.Load).not.toHaveBeenCalled();
    expect(store.runningContent).toBe('v1');
  });

  test('when the refresh fails, no content is kept to anchor errors to (no wrong lines)', async () => {
    editorProxyMock.Load.mockResolvedValue({ content: 'v1', enabled: true });
    await store.load('buzz.js');
    editorProxyMock.Load.mockRejectedValue({ data: 'MqttTimeoutError' });
    changedHandler({ topic: '/wbrules/updates/changed', payload: 'buzz.js' });
    await vi.waitFor(() => expect(store.runningContent).toBeNull());
  });

  test('a changed during this store own save is fully suppressed: no clear, no refresh', async () => {
    editorProxyMock.Load.mockResolvedValue({ content: 'v1', enabled: true });
    await store.load('a.js');
    editorProxyMock.Load.mockClear();
    let resolveSave: (v: any) => void = () => {};
    editorProxyMock.Save.mockImplementation(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));
    const saving = store.save(store.rule);
    changedHandler({ topic: '/wbrules/updates/changed', payload: 'a.js' });
    expect(editorProxyMock.Load).not.toHaveBeenCalled();
    resolveSave({ path: 'a.js' });
    await saving;
  });

  test('a refresh reply that lost the race to a save does not clobber the saved content', async () => {
    editorProxyMock.Load.mockResolvedValue({ content: 'v1', enabled: true });
    await store.load('a.js');
    let resolveLoad: (v: any) => void = () => {};
    editorProxyMock.Load.mockImplementation(() => new Promise((resolve) => {
      resolveLoad = resolve;
    }));
    // an external reload starts a refresh; its Load reply is slow
    changedHandler({ topic: '/wbrules/updates/changed', payload: 'a.js' });
    // meanwhile the user saves - the saved content is the running version now
    store.setRule('saved content');
    editorProxyMock.Save.mockResolvedValue({ path: 'a.js' });
    await store.save(store.rule);
    expect(store.runningContent).toBe('saved content');
    // the stale refresh reply finally arrives and must be dropped
    resolveLoad({ content: 'stale disk content', enabled: true });
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(store.runningContent).toBe('saved content');
  });
});
