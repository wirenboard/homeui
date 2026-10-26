// @vitest-environment happy-dom
import { authStore } from '@/stores/auth';
import { loadPlugins } from './loader';

vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));

const respond = (body: unknown, ok = true) => {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok, json: async () => body }) as any;
};

// Scripts are captured, not loaded: there is no server behind them in the test.
let appended: ReturnType<typeof vi.spyOn>;
const pluginScripts = () => appended.mock.calls.map(([node]) => (node as HTMLScriptElement).getAttribute('src'));

describe('loadPlugins', () => {
  afterEach(() => appended.mockRestore());

  beforeEach(() => {
    appended = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => node);
    delete window.wbHomeui;
    (authStore.hasRights as any).mockImplementation((role: string) => role !== 'admin');
  });

  test('adds a script for each plugin the user may load', async () => {
    respond([
      { id: 'clock', script: '/plugins/clock/index.js', role: 'user' },
      { id: 'ai', script: '/plugins/ai/index.js', role: 'admin' },
    ]);
    await loadPlugins();
    expect(pluginScripts()).toEqual(['/plugins/clock/index.js']);
  });

  test('register() activates the plugin with the shared libraries', async () => {
    respond([]);
    await loadPlugins();
    const activate = vi.fn();
    window.wbHomeui.register({ id: 'p', activate });
    const api = activate.mock.calls[0][0];
    expect(api.version).toBe(1);
    expect(api.libs['react']).toBe(await import('react'));
    expect(api.libs['@codemirror/state']).toBe(await import('@codemirror/state'));
  });

  test('a plugin that throws on start does not break the others', async () => {
    respond([]);
    await loadPlugins();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const second = vi.fn();
    window.wbHomeui.register({
      id: 'bad', activate: () => {
        throw new Error('boom');
      },
    });
    window.wbHomeui.register({ id: 'good', activate: second });
    expect(second).toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('Plugin "bad" failed to start', expect.any(Error));
    error.mockRestore();
  });

  test('no plugin list, no scripts', async () => {
    respond(null, false);
    await loadPlugins();
    expect(pluginScripts()).toEqual([]);
  });
});
