// @vitest-environment happy-dom
import { createPluginApi } from './api';
import { ruleEditorSlot } from './rule-editor-slot';

const { editorMock, rulesMock } = vi.hoisted(() => ({
  editorMock: { List: vi.fn(), Load: vi.fn(), Save: vi.fn(), Remove: vi.fn() },
  rulesMock: {
    rule: { initName: 'a.js', name: 'a.js', content: '', error: null as any },
    setRuleName: vi.fn(),
    logs: [],
  },
}));

vi.mock('@/services', () => ({ editorProxy: editorMock }));
vi.mock('@/stores/rules', () => ({ rulesStore: rulesMock }));
vi.mock('@/stores/devices', () => ({ devicesStore: { devices: new Map(), cells: new Map() } }));
vi.mock('@/stores/console-panel', () => ({ consolePanelStore: { registerTab: vi.fn(), show: vi.fn() } }));

describe('plugin API: rule files', () => {
  test('save reports the wb-rules error with its line', async () => {
    const api = await createPluginApi();
    editorMock.Save.mockResolvedValue({ path: 'b.js', error: 'SyntaxError', traceback: [{ line: 3, name: 'b.js' }] });
    expect(await api.rules.save('b.js', 'x')).toEqual({ message: 'SyntaxError', line: 3 });
    editorMock.Save.mockResolvedValue({ path: 'b.js' });
    expect(await api.rules.save('b.js', 'x')).toBeNull();
  });

  test('list and load speak in paths and text', async () => {
    const api = await createPluginApi();
    editorMock.List.mockResolvedValue([
      { virtualPath: 'dir/c.js', enabled: false, rules: [], devices: [], timers: [] },
    ]);
    editorMock.Load.mockResolvedValue({ content: 'log(1);', enabled: true });
    expect(await api.rules.list()).toEqual([{ path: 'dir/c.js', enabled: false }]);
    expect(await api.rules.load('dir/c.js')).toBe('log(1);');
  });

  test('open goes to the rule editor', async () => {
    const api = await createPluginApi();
    api.rules.open('dir/свет.js');
    expect(window.location.hash).toBe(`#/rules/dir/${encodeURIComponent('свет.js')}`);
  });

  test('onLanguageChange hears the UI switch its language', async () => {
    const api = await createPluginApi();
    const { default: i18n } = await import('@/i18n/config');
    const listener = vi.fn();
    api.onLanguageChange(listener);
    await i18n.changeLanguage('ru');
    expect(listener).toHaveBeenCalledWith('ru');
    await i18n.changeLanguage('en');
  });

  test('setName names the rule in the store', async () => {
    const api = await createPluginApi();
    api.ruleEditor.setName('hall.js');
    expect(rulesMock.setRuleName).toHaveBeenCalledWith('hall.js');
  });

  test('the editor\'s save presses the page\'s «Save» and returns its error', async () => {
    const api = await createPluginApi();
    const pageSave = vi.fn(async () => {
      rulesMock.rule.error = { message: 'ReferenceError', errorLine: 7 };
    });
    ruleEditorSlot.setSave(pageSave);
    expect(await api.ruleEditor.save()).toEqual({ message: 'ReferenceError', line: 7 });
    expect(pageSave).toHaveBeenCalled();
  });
});
