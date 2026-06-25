import { editorProxyMock, mqttClientMock } from '@/test/mocks/services';
import RulesStore from './rules-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/utils/id', () => import('@/test/mocks/utils-id'));

describe('RulesStore', () => {
  let store: RulesStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new RulesStore();
  });

  describe('load', () => {
    test('fetches rule and sets state', async () => {
      editorProxyMock.Load.mockResolvedValue({
        content: 'var x = 1;',
        enabled: true,
      });

      const rule = await store.load('test.js');

      expect(editorProxyMock.Load).toHaveBeenCalledWith({ path: 'test.js' });
      expect(rule.name).toBe('test.js');
      expect(rule.content).toBe('var x = 1;');
      expect(rule.enabled).toBe(true);
    });

    test('sets error if response has error', async () => {
      editorProxyMock.Load.mockResolvedValue({
        content: '',
        enabled: false,
        error: { message: 'syntax error', traceback: [{ line: 5, name: 'test' }] },
      });

      await store.load('broken.js');

      expect(store.rule.error.message).toBe('syntax error');
      expect(store.rule.error.errorLine).toBe(5);
    });
  });

  describe('setRule', () => {
    test('updates content', () => {
      store.setRule('new content');
      expect(store.rule.content).toBe('new content');
    });

    test('clears errorLine when error exists', () => {
      store.rule.error = { message: 'err', errorLine: 5 };
      store.setRule('fixed');
      expect(store.rule.error.errorLine).toBeNull();
    });
  });

  describe('setRuleName', () => {
    test('updates name', () => {
      store.setRuleName('new-name.js');
      expect(store.rule.name).toBe('new-name.js');
    });
  });

  describe('resetRule', () => {
    test('resets to defaults', () => {
      store.rule.name = 'test';
      store.rule.content = 'code';
      store.resetRule();
      expect(store.rule.name).toBe('');
      expect(store.rule.content).toBe('');
      expect(store.rule.enabled).toBe(true);
      expect(store.rule.error).toBeNull();
    });
  });

  describe('save', () => {
    test('saves and returns path', async () => {
      editorProxyMock.Save.mockResolvedValue({ path: 'saved.js' });
      const rule = { name: 'test', initName: 'test.js', content: 'code', enabled: true };

      const path = await store.save(rule);

      expect(editorProxyMock.Save).toHaveBeenCalledWith({ path: 'test.js', content: 'code' });
      expect(path).toBe('saved.js');
    });

    test('generates name for new rule', async () => {
      editorProxyMock.Save.mockResolvedValue({ path: 'new.js' });
      const rule = { name: 'new', initName: '', content: 'code', enabled: true };

      await store.save(rule);

      expect(editorProxyMock.Save).toHaveBeenCalledWith({ path: 'new.js', content: 'code' });
    });

    test('sets error from response', async () => {
      editorProxyMock.Save.mockResolvedValue({
        path: 'test.js',
        error: 'compile error',
        traceback: [{ line: 3, name: 'fn' }],
      });
      store.rule = { name: 'test.js', initName: 'test.js', content: 'bad', enabled: true };

      await store.save(store.rule);

      expect(store.rule.error.message).toBe('compile error');
      expect(store.rule.error.errorLine).toBe(3);
    });
  });

  describe('rename', () => {
    test('calls Rename and returns valid name', async () => {
      editorProxyMock.Rename.mockResolvedValue({});
      vi.useFakeTimers();

      const promise = store.rename('old.js', 'new');

      await vi.advanceTimersByTimeAsync(1500);
      const result = await promise;

      expect(editorProxyMock.Rename).toHaveBeenCalledWith({ path: 'old.js', new_path: 'new.js' });
      expect(result).toBe('new.js');
      vi.useRealTimers();
    });
  });

  describe('checkIsNameUnique', () => {
    test('returns true when name is unique', async () => {
      editorProxyMock.List.mockResolvedValue([
        { virtualPath: 'other.js' },
      ]);

      const result = await store.checkIsNameUnique('new');

      expect(result).toBe(true);
    });

    test('throws when name already exists', async () => {
      editorProxyMock.List.mockResolvedValue([
        { virtualPath: 'existing.js' },
      ]);

      await expect(store.checkIsNameUnique('existing')).rejects.toThrow('file-exists');
    });
  });

  describe('changeState', () => {
    test('calls ChangeState and refreshes list', async () => {
      editorProxyMock.ChangeState.mockResolvedValue({});
      editorProxyMock.List.mockResolvedValue([]);
      vi.useFakeTimers();

      const promise = store.changeState('test.js', false);

      await vi.advanceTimersByTimeAsync(2000);
      await promise;

      expect(editorProxyMock.ChangeState).toHaveBeenCalledWith({ path: 'test.js', state: false });
      expect(editorProxyMock.List).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('copyRule', () => {
    test('loads, generates name, saves, and disables copy', async () => {
      editorProxyMock.Load.mockResolvedValue({ content: 'code', enabled: true });
      editorProxyMock.Save.mockResolvedValue({ path: 'test1.js' });
      editorProxyMock.ChangeState.mockResolvedValue({});
      editorProxyMock.List.mockResolvedValue([]);
      store.rules = [{ virtualPath: 'test.js', enabled: true, rules: [], devices: [], timers: [] }];
      vi.useFakeTimers();

      const promise = store.copyRule('test.js');

      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);
      await promise;

      expect(editorProxyMock.Load).toHaveBeenCalledWith({ path: 'test.js' });
      expect(editorProxyMock.Save).toHaveBeenCalled();
      expect(editorProxyMock.ChangeState).toHaveBeenCalledWith({ path: 'test1.js', state: false });
      vi.useRealTimers();
    });
  });

  describe('getValidRuleName', () => {
    test('appends .js if missing', () => {
      expect(store.getValidRuleName('test')).toBe('test.js');
    });

    test('keeps .js if already present', () => {
      expect(store.getValidRuleName('test.js')).toBe('test.js');
    });
  });

  describe('getList', () => {
    test('fetches and stores rules', async () => {
      const rules = [{ virtualPath: 'a.js', enabled: true, rules: [], devices: [], timers: [] }];
      editorProxyMock.List.mockResolvedValue(rules);

      const result = await store.getList();

      expect(store.rules).toEqual(rules);
      expect(result).toEqual(rules);
    });
  });

  describe('deleteRule', () => {
    test('removes rule from list on success', async () => {
      store.rules = [
        { virtualPath: 'a.js', enabled: true, rules: [], devices: [], timers: [] },
        { virtualPath: 'b.js', enabled: true, rules: [], devices: [], timers: [] },
      ];
      editorProxyMock.Remove.mockResolvedValue(true);

      await store.deleteRule('a.js');

      expect(store.rules).toHaveLength(1);
      expect(store.rules[0].virtualPath).toBe('b.js');
    });

    test('keeps list unchanged on falsy response', async () => {
      store.rules = [{ virtualPath: 'a.js', enabled: true, rules: [], devices: [], timers: [] }];
      editorProxyMock.Remove.mockResolvedValue(false);

      await store.deleteRule('a.js');

      expect(store.rules).toHaveLength(1);
    });
  });

  describe('setError', () => {
    test('sets error with traceback line', () => {
      store.setError({ message: 'err', traceback: [{ line: 10, name: 'fn' }] });
      expect(store.rule.error.message).toBe('err');
      expect(store.rule.error.errorLine).toBe(10);
    });

    test('sets null errorLine without traceback', () => {
      store.setError({ message: 'err' });
      expect(store.rule.error.errorLine).toBeNull();
    });
  });

  describe('subscribeRuleDebugging / toggleRuleDebugging', () => {
    test('subscribes and reads debug state', () => {
      store.subscribeRuleDebugging();
      const handler = mqttClientMock.addStickySubscription.mock.calls[0][1];
      handler({ payload: '1' });
      expect(store.isRuleDebugEnabled).toBe(true);
      handler({ payload: '0' });
      expect(store.isRuleDebugEnabled).toBe(false);
    });

    test('toggleRuleDebugging sends and flips', () => {
      store.isRuleDebugEnabled = false;
      store.toggleRuleDebugging();
      expect(store.isRuleDebugEnabled).toBe(true);
      expect(mqttClientMock.send).toHaveBeenCalledWith(
        '/devices/wbrules/controls/Rule debugging/on', '1', false, 1,
      );
    });
  });

  describe('subscribeRulesLogs / clearLogs', () => {
    test('collects logs from MQTT and caps at 500', () => {
      store.subscribeRulesLogs();
      const handler = mqttClientMock.addStickySubscription.mock.calls[0][1];

      for (let i = 0; i < 501; i++) {
        handler({ topic: '/wbrules/log/info', payload: `msg${i}` });
      }

      expect(store.logs).toHaveLength(500);
      expect(store.logs[0].payload).toBe('msg1');
      expect(store.logs[0].level).toBe('info');
    });

    test('clearLogs empties array', () => {
      store.logs = [{ level: 'info', payload: 'test', time: 0 }];
      store.clearLogs();
      expect(store.logs).toEqual([]);
    });
  });

  describe('unSubscribeRulesLogs', () => {
    test('unsubscribes from topic', () => {
      store.unSubscribeRulesLogs();
      expect(mqttClientMock.unsubscribe).toHaveBeenCalledWith('/wbrules/log/+');
    });
  });
});
