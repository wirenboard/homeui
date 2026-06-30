import { configEditorProxyMock } from '@/test/mocks/services';
import { Dashboard } from './dashboard';
import DashboardsStore from './dashboards-store';
import type { DashboardBase, WidgetBase } from './types';

vi.mock('@/stores/dashboards/index', () => ({ dashboardsStore: {} }));
vi.mock('@/stores/dashboards', () => ({ dashboardsStore: {} }));
vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/utils/id', () => import('@/test/mocks/utils-id'));
vi.mock('@/i18n/config', () => ({ default: { t: vi.fn((key: string) => key) } }));

const makeDashboard = (id: string, overrides: Partial<DashboardBase> = {}): DashboardBase => ({
  id,
  name: `Dashboard ${id}`,
  isSvg: false,
  widgets: [],
  ...overrides,
});

const makeWidget = (id: string): WidgetBase => ({
  id,
  name: `Widget ${id}`,
  description: '',
  compact: false,
  cells: [],
});

describe('DashboardsStore', () => {
  let store: DashboardsStore;

  beforeEach(() => {
    vi.clearAllMocks();
    configEditorProxyMock.Save.mockResolvedValue(undefined);
    store = new DashboardsStore();
  });

  describe('loadData', () => {
    test('populates dashboards, widgets, and metadata', async () => {
      configEditorProxyMock.Load.mockResolvedValue({
        content: {
          dashboards: [makeDashboard('d1')],
          widgets: [makeWidget('w1')],
          defaultDashboardId: 'd1',
          isShowWidgetsPage: true,
          description: 'Home',
        },
      });

      await store.loadData();

      expect(store.dashboards.size).toBe(1);
      expect(store.dashboards.get('d1')?.name).toBe('Dashboard d1');
      expect(store.widgets.size).toBe(1);
      expect(store.defaultDashboardId).toBe('d1');
      expect(store.isShowWidgetsPage).toBe(true);
      expect(store.description).toBe('Home');
      expect(store.isLoading).toBe(false);
    });
  });

  describe('addDashboard', () => {
    test('adds dashboard and saves', async () => {
      const data = makeDashboard('d1');
      await store.addDashboard(data as any);

      expect(store.dashboards.has('d1')).toBe(true);
      expect(configEditorProxyMock.Save).toHaveBeenCalled();
    });
  });

  describe('updateDashboard', () => {
    test('updates in place when id is same', async () => {
      store.dashboards.set('d1', makeDashboard('d1', { name: 'Old' }) as any);

      await store.updateDashboard('d1', makeDashboard('d1', { name: 'New' }) as any);

      expect(store.dashboards.get('d1')?.name).toBe('New');
    });

    test('replaces key when id changes', async () => {
      store.dashboards.set('old', makeDashboard('old') as any);

      await store.updateDashboard('old', makeDashboard('new') as any);

      expect(store.dashboards.has('old')).toBe(false);
      expect(store.dashboards.has('new')).toBe(true);
    });
  });

  describe('updateDashboards', () => {
    test('replaces all dashboards', async () => {
      store.dashboards.set('d1', makeDashboard('d1') as any);

      await store.updateDashboards([makeDashboard('d2'), makeDashboard('d3')] as any);

      expect(store.dashboards.size).toBe(2);
      expect(store.dashboards.has('d1')).toBe(false);
    });
  });

  describe('deleteDashboard', () => {
    test('removes dashboard and saves', async () => {
      store.dashboards.set('d1', makeDashboard('d1') as any);

      await store.deleteDashboard('d1');

      expect(store.dashboards.has('d1')).toBe(false);
      expect(configEditorProxyMock.Save).toHaveBeenCalled();
    });
  });

  describe('addWidgetToDashboard', () => {
    test('adds widget id to dashboard widgets list', () => {
      store.dashboards.set('d1', new Dashboard(makeDashboard('d1')));

      store.addWidgetToDashboard('d1', 'w1');

      expect(store.dashboards.get('d1')?.flatWidgets).toContain('w1');
    });
  });

  describe('removeWidgetFromDashboard', () => {
    test('removes widget id from dashboard', () => {
      store.dashboards.set('d1', new Dashboard(makeDashboard('d1', { widgets: ['w1', 'w2'] })));

      store.removeWidgetFromDashboard('d1', 'w1');

      expect(store.dashboards.get('d1')?.widgets).toEqual([['w2']]);
    });

    test('skips save when withSave is false', () => {
      store.dashboards.set('d1', new Dashboard(makeDashboard('d1', { widgets: ['w1'] })));

      store.removeWidgetFromDashboard('d1', 'w1', false);

      expect(configEditorProxyMock.Save).not.toHaveBeenCalled();
    });
  });

  describe('copyWidget', () => {
    test('copies widget with new id and name', () => {
      store.widgets.set('w1', makeWidget('w1') as any);

      const newId = store.copyWidget('w1');

      expect(newId).toBeDefined();
      expect(store.widgets.get(newId)?.name).toContain('_copy');
    });
  });

  describe('updateWidget', () => {
    test('updates widget in map', () => {
      store.widgets.set('w1', makeWidget('w1') as any);
      const updated = makeWidget('w1');
      updated.name = 'Updated';

      store.updateWidget(updated);

      expect(store.widgets.get('w1')?.name).toBe('Updated');
    });
  });

  describe('deleteWidget', () => {
    test('removes widget from map and from all dashboards', () => {
      store.dashboards.set('d1', new Dashboard(makeDashboard('d1', { widgets: ['w1', 'w2'] })));
      store.widgets.set('w1', makeWidget('w1') as any);
      store.widgets.set('w2', makeWidget('w2') as any);

      store.deleteWidget('w1');

      expect(store.widgets.has('w1')).toBe(false);
      expect(store.dashboards.get('d1')?.widgets).toEqual([['w2']]);
    });
  });

  describe('setters', () => {
    test('setLoading', () => {
      store.setLoading(false);
      expect(store.isLoading).toBe(false);
    });

    test('setDefaultDashboardId saves', () => {
      store.setDefaultDashboardId('d1');
      expect(store.defaultDashboardId).toBe('d1');
      expect(configEditorProxyMock.Save).toHaveBeenCalled();
    });

    test('setIsShowWidgetsPage saves', () => {
      store.setIsShowWidgetsPage(true);
      expect(store.isShowWidgetsPage).toBe(true);
      expect(configEditorProxyMock.Save).toHaveBeenCalled();
    });

    test('setDescription saves', () => {
      store.setDescription('My setup');
      expect(store.description).toBe('My setup');
      expect(configEditorProxyMock.Save).toHaveBeenCalled();
    });
  });

  describe('dashboardsList', () => {
    test('returns array of dashboard values', () => {
      store.dashboards.set('d1', makeDashboard('d1') as any);
      store.dashboards.set('d2', makeDashboard('d2') as any);

      expect(store.dashboardsList).toHaveLength(2);
    });
  });

  describe('_saveData', () => {
    test('saves to configEditorProxy and clears saveError', async () => {
      store.saveError = 'old error';

      await store._saveData();

      expect(configEditorProxyMock.Save).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/etc/wb-webui.conf' }),
      );
      expect(store.saveError).toBeNull();
    });

    test('sets overflow error on QuotaExceededError', async () => {
      configEditorProxyMock.Save.mockRejectedValue({ name: 'QuotaExceededError' });

      await store._saveData();

      expect(store.saveError).toBe('dashboards.errors.overflow');
    });

    test('sets generic error on other failures', async () => {
      configEditorProxyMock.Save.mockRejectedValue(new Error('network'));

      await store._saveData();

      expect(store.saveError).toBe('dashboards.errors.save');
    });
  });
});
