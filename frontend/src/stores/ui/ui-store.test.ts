import { getMenu } from './api';
import { normalizeMenuResponse, toMenuItemInstance, mergeMenuItems } from './menu-items';
import UiStore from './ui-store';

vi.mock('@/i18n/config', () => ({ default: { language: 'en' } }));
vi.mock('@/stores/auth', () => ({
  authStore: { hasRights: vi.fn(() => true) },
  UserRole: { User: 'user', Operator: 'operator', Admin: 'admin' },
}));
vi.mock('@/stores/dashboards', () => ({ dashboardsStore: {} }));
vi.mock('./api', () => ({ getMenu: vi.fn(() => Promise.resolve([])) }));
vi.mock('@/router/legacy-redirects', () => ({
  migrateLegacyUrl: vi.fn((url: string) => url),
}));
vi.mock('@/assets/icons/desktop.svg', () => ({ default: 'DesktopIcon' }));
vi.mock('@/assets/icons/file.svg', () => ({ default: 'FileIcon' }));
vi.mock('@/assets/icons/integrations.svg', () => ({ default: 'IntegrationsIcon' }));
vi.mock('@/assets/icons/settings.svg', () => ({ default: 'SettingsIcon' }));
vi.mock('@/assets/icons/sitemap.svg', () => ({ default: 'SitemapIcon' }));
vi.mock('@/assets/icons/stats.svg', () => ({ default: 'StatsIcon' }));

const getItemMock = vi.fn(() => null);
const setItemMock = vi.fn();
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: getItemMock, setItem: setItemMock },
});

describe('UiStore', () => {
  let store: UiStore;

  beforeEach(() => {
    vi.clearAllMocks();
    getItemMock.mockReturnValue(null);
    store = new UiStore();
  });

  describe('setIsConnected', () => {
    test('sets connection state', () => {
      store.setIsConnected(true);
      expect(store.isConnected).toBe(true);
      store.setIsConnected(false);
      expect(store.isConnected).toBe(false);
    });
  });

  describe('setTheme', () => {
    test('sets theme and persists', () => {
      store.setTheme('dark');
      expect(store.theme).toBe('dark');
      expect(setItemMock).toHaveBeenCalledWith('theme', 'dark');
    });
  });

  describe('constructor', () => {
    test('reads theme from localStorage', () => {
      getItemMock.mockReturnValue('dark');
      const s = new UiStore();
      expect(s.theme).toBe('dark');
    });

    test('defaults to bootstrap', () => {
      expect(store.theme).toBe('bootstrap');
    });
  });

  describe('buildMenu', () => {
    test('builds menu from base and custom items', async () => {
      vi.mocked(getMenu).mockResolvedValue([
        { id: 'custom', url: '/custom', title: { en: 'Custom' } },
      ]);

      await store.buildMenu([], false, new URLSearchParams());

      expect(store.menuItems.length).toBeGreaterThan(0);
      expect(store.menuItems.some((i) => i.url === '/custom')).toBe(true);
    });

    test('builds menu with empty custom items', async () => {
      vi.mocked(getMenu).mockResolvedValue([]);

      await store.buildMenu([], false, new URLSearchParams());

      expect(store.menuItems.length).toBeGreaterThan(0);
    });

    test('caches custom items across calls', async () => {
      vi.mocked(getMenu).mockResolvedValue([]);

      await store.buildMenu([], false, new URLSearchParams());
      await store.buildMenu([], false, new URLSearchParams());

      expect(getMenu).toHaveBeenCalledTimes(1);
    });

    test('collects module ids from custom items with children', async () => {
      vi.mocked(getMenu).mockResolvedValue([
        {
          id: 'parent',
          children: [
            { id: 'mod-a', url: '/a', title: { en: 'A' } },
            { id: 'mod-b', url: '/b', title: { en: 'B' } },
          ],
        },
      ]);

      await store.buildMenu([], false, new URLSearchParams());

      expect(store.modules).toEqual(['mod-a', 'mod-b']);
    });

    test('collects nested module ids', async () => {
      vi.mocked(getMenu).mockResolvedValue([
        {
          id: 'root',
          children: [
            {
              id: 'level1',
              children: [{ id: 'level2', url: '/deep', title: { en: 'Deep' } }],
            },
          ],
        },
      ]);

      await store.buildMenu([], false, new URLSearchParams());

      expect(store.modules).toContain('level1');
      expect(store.modules).toContain('level2');
    });

    test('deduplicates module ids', async () => {
      vi.mocked(getMenu).mockResolvedValue([
        {
          id: 'a',
          children: [{ id: 'dup', url: '/x', title: { en: 'X' } }],
        },
        {
          id: 'b',
          children: [{ id: 'dup', url: '/y', title: { en: 'Y' } }],
        },
      ]);

      await store.buildMenu([], false, new URLSearchParams());

      expect(store.modules.filter((m) => m === 'dup')).toHaveLength(1);
    });

    test('handles items without children', async () => {
      vi.mocked(getMenu).mockResolvedValue([
        { id: 'leaf', url: '/leaf', title: { en: 'Leaf' } },
      ]);

      await store.buildMenu([], false, new URLSearchParams());

      expect(store.modules).toEqual([]);
    });
  });
});

describe('normalizeMenuResponse', () => {
  test('returns empty for non-array', () => {
    expect(normalizeMenuResponse(null as any)).toEqual([]);
  });

  test('flattens nested arrays', () => {
    const result = normalizeMenuResponse([
      [{ id: 'a' }, { id: 'b' }] as any,
      { id: 'c' },
    ]);
    expect(result).toHaveLength(3);
  });

  test('skips non-objects', () => {
    const result = normalizeMenuResponse(['string' as any, null as any, { id: 'a' }]);
    expect(result).toHaveLength(1);
  });
});

describe('toMenuItemInstance', () => {
  test('maps custom item to instance', () => {
    const result = toMenuItemInstance(
      { id: 'test', url: '/test', title: { en: 'Test', ru: 'Тест' } },
      'en',
    );
    expect(result).toEqual({
      id: 'test',
      url: '/test',
      label: 'Test',
      children: undefined,
    });
  });

  test('falls back to ru title', () => {
    const result = toMenuItemInstance(
      { id: 'test', title: { ru: 'Тест' } },
      'fr',
    );
    expect(result.label).toBe('Тест');
  });

  test('falls back to id when no title', () => {
    const result = toMenuItemInstance({ id: 'my-item' }, 'en');
    expect(result.label).toBe('my-item');
  });

  test('hides alice for english', () => {
    const result = toMenuItemInstance({ id: 'alice', title: { en: 'Alice' } }, 'en');
    expect(result.isShow).toBe(false);
  });

  test('shows alice for non-english', () => {
    const result = toMenuItemInstance({ id: 'alice', title: { ru: 'Алиса' } }, 'ru');
    expect(result.isShow).toBe(true);
  });

  test('normalizes url with leading slash', () => {
    const result = toMenuItemInstance({ id: 'x', url: 'no-slash' }, 'en');
    expect(result.url).toBe('/no-slash');
  });

  test('maps children recursively', () => {
    const result = toMenuItemInstance({
      id: 'parent',
      children: [{ id: 'child', title: { en: 'Child' } }],
    }, 'en');
    expect(result.children).toHaveLength(1);
    expect(result.children[0].label).toBe('Child');
  });

  test('keeps external url verbatim and flags it', () => {
    const result = toMenuItemInstance(
      { id: 'node-red', url: '/node-red/', title: { en: 'Node-RED' }, isExternal: true },
      'en',
    );
    expect(result.url).toBe('/node-red/');
    expect(result.isExternal).toBe(true);
  });

  test('does not set isExternal for internal items', () => {
    const result = toMenuItemInstance({ id: 'x', url: '/x' }, 'en');
    expect(result.isExternal).toBeUndefined();
  });
});

describe('mergeMenuItems', () => {
  test('returns base items when no custom items', () => {
    const base = [{ label: 'A', url: '/a' }];
    const result = mergeMenuItems(base, []);
    expect(result).toEqual(base);
  });

  test('merges children for matching id', () => {
    const base = [{ label: 'Settings', id: 'settings', children: [{ label: 'A', url: '/a' }] }];
    const custom = [{ label: 'settings', id: 'settings', children: [{ label: 'B', url: '/b' }] }];

    const result = mergeMenuItems(base, custom);

    const settings = result.find((i) => i.id === 'settings');
    expect(settings.children).toHaveLength(2);
  });

  test('appends new custom items', () => {
    const base = [{ label: 'A', url: '/a' }];
    const custom = [{ label: 'B', id: 'b', url: '/b' }];

    const result = mergeMenuItems(base, custom);

    expect(result).toHaveLength(2);
  });

  test('filters out items without url or visible children', () => {
    const base = [{ label: 'Empty', id: 'empty' }];
    const result = mergeMenuItems(base, []);
    expect(result.find((i) => i.id === 'empty')).toBeUndefined();
  });

  test('appends external custom item preserving the flag', () => {
    const base = [{ label: 'A', url: '/a' }];
    const custom = [{ label: 'Node-RED', id: 'node-red', url: '/node-red/', isExternal: true }];

    const result = mergeMenuItems(base, custom);

    const ext = result.find((i) => i.id === 'node-red');
    expect(ext?.isExternal).toBe(true);
    expect(ext?.url).toBe('/node-red/');
  });
});
