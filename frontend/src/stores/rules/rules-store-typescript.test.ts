// TypeScript rule-file support in the rules store (new engine feature).
import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/utils/id', () => import('@/test/mocks/utils-id'));

const { default: RulesStore } = await import('./rules-store');

describe('rules store TypeScript support', () => {
  const store = new RulesStore();

  it('keeps .ts names as-is', () => {
    expect(store.getValidRuleName('heating.ts')).toBe('heating.ts');
  });

  it('keeps .js names as-is', () => {
    expect(store.getValidRuleName('heating.js')).toBe('heating.js');
  });

  it('defaults extensionless names to .js', () => {
    expect(store.getValidRuleName('heating')).toBe('heating.js');
  });
});

const { editorProxyMock, mqttClientMock } = await import('@/test/mocks/services');

describe('rename/save pre-check extension', () => {

  it('checks the .ts path a rename of a .ts rule will target', async () => {
    const store = new RulesStore();
    store.rule.initName = 'heating.ts';
    editorProxyMock.List.mockResolvedValue([{ virtualPath: 'bar.ts' }]);
    await expect(store.checkIsNameUnique('bar')).rejects.toThrow('file-exists');
  });

  it('does not flag a same-named .js file when renaming a .ts rule', async () => {
    const store = new RulesStore();
    store.rule.initName = 'heating.ts';
    editorProxyMock.List.mockResolvedValue([{ virtualPath: 'bar.js' }]);
    await expect(store.checkIsNameUnique('bar')).resolves.toBe(true);
  });
});

describe('RulesStore.checkTsFile (controller verdict)', () => {
  let store: InstanceType<typeof RulesStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    editorProxyMock.hasMethod.mockResolvedValue(true);
    store = new RulesStore();
    store.setRule('var x = 1;');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('polls through pending to ready and records the verdict with the checked content', async () => {
    editorProxyMock.Check
      .mockResolvedValueOnce({ status: 'pending', diags: [] })
      .mockResolvedValueOnce({ status: 'pending', diags: [] })
      .mockResolvedValueOnce({
        status: 'ready', diags: [{ line: 1, column: 5, severity: 'error', message: 'bad' }],
      });
    const done = store.checkTsFile('a.js');
    await vi.advanceTimersByTimeAsync(3000);
    await done;
    expect(editorProxyMock.Check).toHaveBeenCalledTimes(3);
    expect(editorProxyMock.Check).toHaveBeenCalledWith({ path: 'a.js' });
    expect(store.tsCheckDiags).toEqual([{ line: 1, column: 5, severity: 'error', message: 'bad' }]);
    expect(store.tsCheckedContent).toBe('var x = 1;');
  });

  test('an engine without the check (unsupported, or a missing diags array) leaves no stale verdict', async () => {
    editorProxyMock.Check.mockResolvedValueOnce({ status: 'unsupported' });
    await store.checkTsFile('a.js');
    expect(store.tsCheckDiags).toEqual([]);
    expect(store.tsCheckedContent).toBe('var x = 1;');
    editorProxyMock.Check.mockResolvedValueOnce({ status: 'ready' });
    await store.checkTsFile('a.js');
    expect(store.tsCheckDiags).toEqual([]);
  });

  test('old firmware without Editor.Check is asked once through the method advertisement, not polled', async () => {
    editorProxyMock.hasMethod.mockResolvedValue(false);
    await store.checkTsFile('a.js');
    expect(editorProxyMock.hasMethod).toHaveBeenCalledWith('Check');
    expect(editorProxyMock.Check).not.toHaveBeenCalled();
    expect(store.tsCheckDiags).toEqual([]);
  });

  test('a rejecting Check RPC clears the previous verdict instead of leaving a stale one', async () => {
    editorProxyMock.Check.mockResolvedValueOnce({
      status: 'ready', diags: [{ line: 1, column: 1, severity: 'error', message: 'old' }],
    });
    await store.checkTsFile('a.js');
    expect(store.tsCheckDiags).toHaveLength(1);
    editorProxyMock.Check.mockRejectedValueOnce({ data: 'MqttTimeoutError' });
    await store.checkTsFile('a.js');
    expect(store.tsCheckDiags).toEqual([]);
    expect(store.tsCheckedContent).toBeNull();
  });

  test('a controller that stays pending exhausts the backing-off poll, leaving a clean slate', async () => {
    editorProxyMock.Check.mockResolvedValue({ status: 'pending', diags: [] });
    const done = store.checkTsFile('a.js');
    await vi.advanceTimersByTimeAsync(120000);
    await done;
    expect(editorProxyMock.Check).toHaveBeenCalledTimes(40);
    expect(store.tsCheckDiags).toEqual([]);
    expect(store.tsCheckedContent).toBeNull();
  });

  test('a newer check or leaving the page cancels an in-flight poll', async () => {
    editorProxyMock.Check.mockResolvedValue({ status: 'pending', diags: [] });
    const first = store.checkTsFile('a.js');
    await vi.advanceTimersByTimeAsync(100);
    store.clearTsCheck(); // navigation away
    editorProxyMock.Check.mockResolvedValue({
      status: 'ready', diags: [{ line: 2, column: 1, severity: 'warning', message: 'late' }],
    });
    await vi.advanceTimersByTimeAsync(5000);
    await first;
    expect(store.tsCheckDiags).toEqual([]); // the cancelled poll did not write its late verdict
  });
});

describe('RulesStore.save and runtime errors', () => {
  let store: InstanceType<typeof RulesStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new RulesStore();
  });

  test('clears the previous version before saving and keeps what the new version logs while loading', async () => {
    store.recordRuntimeError('old at /etc/wb-rules/a.js:1', 1);
    let resolveSave: (v: any) => void = () => {};
    editorProxyMock.Save.mockImplementation(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));
    const saving = store.save({ name: 'a.js', initName: 'a.js', content: 'dev["x/y"] = "bad";', enabled: true });
    // the engine runs the file before it replies: an error of the NEW version
    // arrives now, then the "changed" notification, then the reply
    expect(store.runtimeErrors).toEqual([]);
    store.recordRuntimeError('control x/y: write ignored (bad) at /etc/wb-rules/a.js:1', 2);
    store.subscribeRulesLogs();
    const handler = mqttClientMock.addStickySubscription.mock.calls
      .find(([topic]: [string]) => topic === '/wbrules/updates/changed')?.[1];
    handler({ payload: 'a.js' });
    expect(store.runtimeErrors).toHaveLength(1); // not wiped: it belongs to the version just loaded
    resolveSave({ path: 'a.js' });
    await saving;
    expect(store.runtimeErrors).toHaveLength(1);
    expect(store.runningContent).toBe('dev["x/y"] = "bad";');
    // a later external reload of the same file clears as before
    handler({ payload: 'a.js' });
    expect(store.runtimeErrors).toEqual([]);
  });

  test('restores the cleared errors when the save itself fails', async () => {
    store.recordRuntimeError('old at /etc/wb-rules/a.js:1', 1);
    editorProxyMock.Save.mockRejectedValue({ data: 'MqttTimeoutError' });
    await expect(store.save({ name: 'a.js', initName: 'a.js', content: 'x', enabled: true }))
      .rejects.toMatchObject({ data: 'MqttTimeoutError' });
    // the engine never got the new version: the old one keeps running and
    // its errors still describe it
    expect(store.runtimeErrors).toHaveLength(1);
    expect(store.runtimeErrors[0]).toMatchObject({ path: '/etc/wb-rules/a.js', line: 1 });
    expect(store.runningContent).toBeNull();
  });

  test('overlapping saves of one path suppress the changed-clear until the last one ends', async () => {
    const resolvers: ((v: any) => void)[] = [];
    editorProxyMock.Save.mockImplementation(() => new Promise((resolve) => {
      resolvers.push(resolve);
    }));
    store.subscribeRulesLogs();
    const handler = mqttClientMock.addStickySubscription.mock.calls
      .find(([topic]: [string]) => topic === '/wbrules/updates/changed')?.[1];
    const first = store.save({ name: 'a.js', initName: 'a.js', content: 'v1', enabled: true });
    const second = store.save({ name: 'a.js', initName: 'a.js', content: 'v2', enabled: true });
    resolvers[0]({ path: 'a.js' });
    await first;
    // the second save is still in flight: what its version logs while
    // loading, and its "changed", arrive now - and must not be wiped just
    // because the first save has already finished
    store.recordRuntimeError('e at /etc/wb-rules/a.js:2', 5);
    handler({ payload: 'a.js' });
    expect(store.runtimeErrors).toHaveLength(1);
    resolvers[1]({ path: 'a.js' });
    await second;
    expect(store.runtimeErrors).toHaveLength(1);
    // with no save in flight any more, an external reload clears again
    handler({ payload: 'a.js' });
    expect(store.runtimeErrors).toEqual([]);
  });
});
