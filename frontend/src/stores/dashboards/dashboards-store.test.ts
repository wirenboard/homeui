import {
  deleteDashboardMock,
  getDashboardSvgMock,
  getDashboardsMock,
  patchDashboardMock,
  putDashboardMock,
  saveDashboardsMock,
} from '@/test/mocks/dashboards-api';
import { Dashboard } from './dashboard';
import DashboardsStore from './dashboards-store';
import type { DashboardBase, WidgetBase } from './types';

vi.mock('@/stores/dashboards/index', () => ({ dashboardsStore: {} }));
vi.mock('@/stores/dashboards', () => ({ dashboardsStore: {} }));
vi.mock('./api', () => import('@/test/mocks/dashboards-api'));
vi.mock('@/utils/id', () => import('@/test/mocks/utils-id'));
vi.mock('@/i18n/config', () => ({ default: { t: vi.fn((key: string) => key) } }));

const makeDashboard = (id: string, overrides: Partial<DashboardBase> = {}): DashboardBase => ({
  id,
  name: `Dashboard ${id}`,
  isSvg: false,
  widgets: [],
  ...overrides,
});

const makeSvgDashboard = (id: string, current: string): DashboardBase => ({
  id,
  name: `Dashboard ${id}`,
  isSvg: true,
  widgets: [],
  svg_fullwidth: false,
  svg_url: 'local',
  swipe: { enable: false, left: null, right: null },
  svg: { current, original: {}, params: [{ id: 'el1' } as any] },
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
    saveDashboardsMock.mockResolvedValue(undefined);
    putDashboardMock.mockResolvedValue(undefined);
    patchDashboardMock.mockResolvedValue(undefined);
    deleteDashboardMock.mockResolvedValue(undefined);
    store = new DashboardsStore();
  });

  describe('loadData', () => {
    test('populates dashboards, widgets, and metadata from the config returned directly', async () => {
      getDashboardsMock.mockResolvedValue({
        dashboards: [makeDashboard('d1')],
        widgets: [makeWidget('w1')],
        defaultDashboardId: 'd1',
        isShowWidgetsPage: true,
        description: 'Home',
      });

      await store.loadData();

      expect(store.dashboards.size).toBe(1);
      expect(store.dashboards.get('d1')?.name).toBe('Dashboard d1');
      expect(store.widgets.size).toBe(1);
      expect(store.defaultDashboardId).toBe('d1');
      expect(store.isShowWidgetsPage).toBe(true);
      expect(store.description).toBe('Home');
      expect(store.isLoading).toBe(false);
      expect(store.loadError).toBeNull();
    });

    test('sets loadError and clears loading when the request fails', async () => {
      store.loadError = null;
      getDashboardsMock.mockRejectedValue(new Error('network'));

      await store.loadData();

      expect(store.isLoading).toBe(false);
      expect(store.loadError).toBe('dashboards.errors.load');
    });

    test('resets a previous loadError at the start of a successful load', async () => {
      store.loadError = 'dashboards.errors.load';
      getDashboardsMock.mockResolvedValue({
        dashboards: [],
        widgets: [],
        defaultDashboardId: null,
      });

      await store.loadData();

      expect(store.loadError).toBeNull();
    });
  });

  describe('loadSvg', () => {
    test('loadSvg delegates to dashboardsApi.getDashboardSvg and returns the markup', async () => {
      getDashboardSvgMock.mockResolvedValue('<svg>markup</svg>');

      const markup = await store.loadSvg('d1');

      expect(getDashboardSvgMock).toHaveBeenCalledWith('d1');
      expect(markup).toBe('<svg>markup</svg>');
    });
  });

  describe('saveSvgDashboard', () => {
    test('PUTs the whole dashboard (incl. svg.current) and sets it in the local map', async () => {
      const dashboard = makeSvgDashboard('s1', '<svg>markup</svg>');

      const result = await store.saveSvgDashboard('s1', dashboard);

      expect(result).toBe('ok');
      const [url, body] = putDashboardMock.mock.calls[0];
      expect(url).toBe('s1');
      expect(body.id).toBe('s1');
      expect(body.svg.current).toBe('<svg>markup</svg>');
      expect(store.dashboards.has('s1')).toBe(true);
      expect(store.saveError).toBeNull();
    });

    test('forwards the caller-provided body (incl. svg.current) to the API verbatim', async () => {
      // The caller (the SVG editor) is responsible for passing a plain snapshot; the store sends it
      // through without re-cloning per field.
      const body = makeSvgDashboard('s1', '<svg>markup</svg>');

      await store.saveSvgDashboard('s1', body);

      expect(putDashboardMock).toHaveBeenCalledWith('s1', body);
      expect(putDashboardMock.mock.calls[0][1].svg.current).toBe('<svg>markup</svg>');
    });

    test('rename updates the local map: drops the old id and stores the new one', async () => {
      store.dashboards.set('old', new Dashboard(makeSvgDashboard('old', '<svg/>')));
      const renamed = makeSvgDashboard('new', '<svg>renamed</svg>');

      const result = await store.saveSvgDashboard('old', renamed);

      expect(result).toBe('ok');
      expect(putDashboardMock).toHaveBeenCalledWith('old', expect.objectContaining({ id: 'new' }));
      expect(store.dashboards.has('old')).toBe(false);
      expect(store.dashboards.has('new')).toBe(true);
    });

    test('on a 409 conflict returns "conflict" and does not mutate the local map', async () => {
      store.dashboards.set('old', new Dashboard(makeSvgDashboard('old', '<svg/>')));
      putDashboardMock.mockRejectedValue({ response: { status: 409 } });

      const result = await store.saveSvgDashboard('old', makeSvgDashboard('taken', '<svg/>'));

      expect(result).toBe('conflict');
      expect(store.dashboards.has('old')).toBe(true);
      expect(store.dashboards.has('taken')).toBe(false);
      expect(store.saveError).toBeNull();
    });

    test('on a non-conflict error returns "error" and sets the generic save error', async () => {
      putDashboardMock.mockRejectedValue(new Error('network'));

      const result = await store.saveSvgDashboard('s1', makeSvgDashboard('s1', '<svg/>'));

      expect(result).toBe('error');
      expect(store.saveError).toBe('dashboards.errors.save');
    });
  });

  describe('addDashboard', () => {
    test('adds dashboard and persists via the list PUT', async () => {
      const data = makeDashboard('d1');
      await store.addDashboard(data as any);

      expect(store.dashboards.has('d1')).toBe(true);
      expect(saveDashboardsMock).toHaveBeenCalled();
    });
  });

  describe('updateDashboard', () => {
    test('non-rename edit merges over the existing dashboard, preserving widgets, and uses the list PUT', async () => {
      store.dashboards.set('d1', new Dashboard(makeDashboard('d1', { name: 'Old', widgets: ['w1'] })));

      // The DashboardEdit modal sends only the edited id/name.
      await store.updateDashboard('d1', { id: 'd1', name: 'New' } as any);

      expect(store.dashboards.get('d1')?.name).toBe('New');
      // widgets preserved from the existing dashboard
      expect(store.dashboards.get('d1')?.widgets).toEqual(['w1']);
      expect(saveDashboardsMock).toHaveBeenCalled();
      expect(patchDashboardMock).not.toHaveBeenCalled();
    });

    test('rename persists via PATCH, updates the local map only after success, and preserves widgets', async () => {
      store.dashboards.set('old', new Dashboard(makeDashboard('old', { name: 'Old', widgets: ['w1'] })));

      await store.updateDashboard('old', { id: 'new', name: 'Renamed' } as any);

      expect(patchDashboardMock).toHaveBeenCalledWith('old', { id: 'new', name: 'Renamed' });
      expect(store.dashboards.has('old')).toBe(false);
      expect(store.dashboards.has('new')).toBe(true);
      // widgets preserved from the existing dashboard
      expect(store.dashboards.get('new')?.widgets).toEqual(['w1']);
      expect(saveDashboardsMock).not.toHaveBeenCalled();
    });

    test('rename onto a taken id (409) leaves the local map unchanged and keeps the old id', async () => {
      store.dashboards.set('old', new Dashboard(makeDashboard('old')));
      patchDashboardMock.mockRejectedValue({ response: { status: 409 } });

      await store.updateDashboard('old', { id: 'taken', name: 'X' } as any);

      expect(store.dashboards.has('old')).toBe(true);
      expect(store.dashboards.has('taken')).toBe(false);
    });

    test('rename failing with a non-409 error sets saveError and leaves the local map unchanged', async () => {
      store.dashboards.set('old', new Dashboard(makeDashboard('old', { name: 'Old' })));
      patchDashboardMock.mockRejectedValue(new Error('network'));

      await store.updateDashboard('old', { id: 'new', name: 'Renamed' } as any);

      expect(store.saveError).toBe('dashboards.errors.save');
      expect(store.dashboards.has('old')).toBe(true);
      expect(store.dashboards.has('new')).toBe(false);
    });
  });

  describe('setDashboardHidden', () => {
    test('PATCHes options.isHidden and updates the local dashboard options', async () => {
      store.dashboards.set('d1', new Dashboard(makeDashboard('d1')));

      await store.setDashboardHidden('d1', true);

      expect(patchDashboardMock).toHaveBeenCalledWith('d1', { options: { isHidden: true } });
      expect(store.dashboards.get('d1')?.options?.isHidden).toBe(true);
      expect(saveDashboardsMock).not.toHaveBeenCalled();
      expect(store.saveError).toBeNull();
    });

    test('on a failed PATCH sets saveError and leaves the local options unchanged (no optimistic flip)', async () => {
      store.dashboards.set('d1', new Dashboard(makeDashboard('d1', { options: { isHidden: false } })));
      patchDashboardMock.mockRejectedValue(new Error('network'));

      await store.setDashboardHidden('d1', true);

      expect(store.saveError).toBe('dashboards.errors.save');
      expect(store.dashboards.get('d1')?.options?.isHidden).toBe(false);
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
    test('DELETEs the dashboard and removes it from the local map', async () => {
      store.dashboards.set('d1', makeDashboard('d1') as any);

      await store.deleteDashboard('d1');

      expect(deleteDashboardMock).toHaveBeenCalledWith('d1');
      expect(store.dashboards.has('d1')).toBe(false);
      expect(saveDashboardsMock).not.toHaveBeenCalled();
    });

    test('works for an svg dashboard (single DELETE, no list PUT)', async () => {
      store.dashboards.set('s1', new Dashboard(makeSvgDashboard('s1', '<svg/>')));

      await store.deleteDashboard('s1');

      expect(deleteDashboardMock).toHaveBeenCalledWith('s1');
      expect(store.dashboards.has('s1')).toBe(false);
    });

    test('keeps the dashboard locally and sets the save error when the DELETE fails', async () => {
      store.dashboards.set('d1', makeDashboard('d1') as any);
      deleteDashboardMock.mockRejectedValue(new Error('network'));

      await store.deleteDashboard('d1');

      expect(store.dashboards.has('d1')).toBe(true);
      expect(store.saveError).toBe('dashboards.errors.save');
    });
  });

  describe('addWidgetToDashboard', () => {
    test('adds widget id to dashboard widgets list', () => {
      store.dashboards.set('d1', makeDashboard('d1') as any);

      store.addWidgetToDashboard('d1', 'w1');

      expect(store.dashboards.get('d1')?.widgets).toContain('w1');
    });
  });

  describe('removeWidgetFromDashboard', () => {
    test('removes widget id from dashboard', () => {
      store.dashboards.set('d1', makeDashboard('d1', { widgets: ['w1', 'w2'] }) as any);

      store.removeWidgetFromDashboard('d1', 'w1');

      expect(store.dashboards.get('d1')?.widgets).toEqual(['w2']);
    });

    test('skips save when withSave is false', () => {
      store.dashboards.set('d1', makeDashboard('d1', { widgets: ['w1'] }) as any);

      store.removeWidgetFromDashboard('d1', 'w1', false);

      expect(saveDashboardsMock).not.toHaveBeenCalled();
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
      expect(store.dashboards.get('d1')?.widgets).toEqual(['w2']);
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
      expect(saveDashboardsMock).toHaveBeenCalled();
    });

    test('setIsShowWidgetsPage saves', () => {
      store.setIsShowWidgetsPage(true);
      expect(store.isShowWidgetsPage).toBe(true);
      expect(saveDashboardsMock).toHaveBeenCalled();
    });

    test('setDescription saves', () => {
      store.setDescription('My setup');
      expect(store.description).toBe('My setup');
      expect(saveDashboardsMock).toHaveBeenCalled();
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
    test('saves to dashboardsApi and clears saveError', async () => {
      store.saveError = 'old error';

      await store._saveData();

      expect(saveDashboardsMock).toHaveBeenCalledWith(
        expect.objectContaining({ dashboards: expect.any(Array) }),
      );
      expect(store.saveError).toBeNull();
    });

    test('strips svg.current from every dashboard but keeps svg.params and other svg keys', async () => {
      store.dashboards.set('s1', new Dashboard(makeSvgDashboard('s1', '<svg>big markup</svg>')));
      store.dashboards.set('t1', new Dashboard(makeDashboard('t1')));

      await store._saveData();

      const sentConfig = saveDashboardsMock.mock.calls[0][0];
      const svgDashboard = sentConfig.dashboards.find((d: DashboardBase) => d.id === 's1');
      expect(svgDashboard.svg).toBeDefined();
      expect(svgDashboard.svg.current).toBeUndefined();
      expect(svgDashboard.svg.params).toEqual([{ id: 'el1' }]);
      expect(svgDashboard.svg_url).toBe('local');
    });

    test('does not mutate the in-memory dashboard svg.current when stripping for save', async () => {
      store.dashboards.set('s1', new Dashboard(makeSvgDashboard('s1', '<svg>keep me</svg>')));

      await store._saveData();

      expect(store.dashboards.get('s1')?.svg?.current).toBe('<svg>keep me</svg>');
    });

    test('sets generic error on save failure', async () => {
      saveDashboardsMock.mockRejectedValue(new Error('network'));

      await store._saveData();

      expect(store.saveError).toBe('dashboards.errors.save');
    });
  });
});
