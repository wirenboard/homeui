import { reaction } from 'mobx';
import { dashboardsStoreMock } from '@/test/mocks/dashboards-store';
import { SvgDashboardPageStore } from './store';

vi.mock('@/stores/dashboards', () => import('@/test/mocks/dashboards-store'));
vi.mock('@/stores/devices', () => ({
  devicesStore: {
    cells: new Map(),
    subscribeOnCellValue: vi.fn(() => () => {}),
  },
}));

const makeSvgDashboard = (id: string, overrides: Record<string, any> = {}) => ({
  id,
  name: `Dashboard ${id}`,
  isSvg: true,
  svg: { params: [] },
  swipe: { enable: false, left: null, right: null },
  ...overrides,
});

describe('SvgDashboardPageStore', () => {
  let store: SvgDashboardPageStore;

  beforeEach(() => {
    vi.clearAllMocks();
    dashboardsStoreMock.dashboardsList = [];
    store = new SvgDashboardPageStore();
  });

  describe('lazy svg loading', () => {
    test('setDashboard fetches markup for the opened dashboard into svgMarkup', async () => {
      dashboardsStoreMock.dashboardsList = [makeSvgDashboard('s1')];
      dashboardsStoreMock.loadSvg.mockResolvedValue('<svg>s1</svg>');

      store.setDashboard('s1');
      await vi.waitFor(() => expect(store.getSvg('s1')).toBe('<svg>s1</svg>'));

      expect(dashboardsStoreMock.loadSvg).toHaveBeenCalledWith('s1');
      expect(store.svgErrors.has('s1')).toBe(false);
    });

    test('fetches markup for swipe neighbours as well as the current dashboard', async () => {
      dashboardsStoreMock.dashboardsList = [
        makeSvgDashboard('s1', { swipe: { enable: true, left: 's3', right: 's2' } }),
        makeSvgDashboard('s2'),
        makeSvgDashboard('s3'),
      ];
      dashboardsStoreMock.loadSvg.mockImplementation((id: string) => Promise.resolve(`<svg>${id}</svg>`));

      store.setDashboard('s1');
      await vi.waitFor(() => {
        expect(store.getSvg('s1')).toBe('<svg>s1</svg>');
        expect(store.getSvg('s2')).toBe('<svg>s2</svg>');
        expect(store.getSvg('s3')).toBe('<svg>s3</svg>');
      });
    });

    test('a failed svg fetch sets svgErrors for that id without throwing or blocking others', async () => {
      dashboardsStoreMock.dashboardsList = [
        makeSvgDashboard('ok', { swipe: { enable: true, left: null, right: 'bad' } }),
        makeSvgDashboard('bad'),
      ];
      dashboardsStoreMock.loadSvg.mockImplementation((id: string) =>
        (id === 'bad' ? Promise.reject(new Error('404')) : Promise.resolve('<svg>ok</svg>')));

      store.setDashboard('ok');

      await vi.waitFor(() => {
        expect(store.getSvg('ok')).toBe('<svg>ok</svg>');
        expect(store.svgErrors.get('bad')).toBe(true);
      });
      expect(store.getSvg('bad')).toBeNull();
    });

    test('does not refetch an svg that is already loaded', async () => {
      dashboardsStoreMock.dashboardsList = [makeSvgDashboard('s1')];
      dashboardsStoreMock.loadSvg.mockResolvedValue('<svg>s1</svg>');

      store.setDashboard('s1');
      await vi.waitFor(() => expect(store.getSvg('s1')).toBe('<svg>s1</svg>'));
      store.setDashboard('s1');
      await Promise.resolve();

      expect(dashboardsStoreMock.loadSvg).toHaveBeenCalledTimes(1);
    });

    test('retries the fetch on a later setDashboard after the first fetch failed', async () => {
      dashboardsStoreMock.dashboardsList = [makeSvgDashboard('s1')];
      dashboardsStoreMock.loadSvg.mockRejectedValueOnce(new Error('404'));

      store.setDashboard('s1');
      await vi.waitFor(() => expect(store.svgErrors.get('s1')).toBe(true));
      expect(store.getSvg('s1')).toBeNull();

      dashboardsStoreMock.loadSvg.mockResolvedValue('<svg>s1</svg>');
      store.setDashboard('s1');

      await vi.waitFor(() => expect(store.getSvg('s1')).toBe('<svg>s1</svg>'));
      expect(dashboardsStoreMock.loadSvg).toHaveBeenCalledTimes(2);
      expect(store.svgErrors.has('s1')).toBe(false);
    });

    test('treats a successful empty-string markup as loaded and does not refetch or error', async () => {
      dashboardsStoreMock.dashboardsList = [makeSvgDashboard('s1')];
      dashboardsStoreMock.loadSvg.mockResolvedValue('');

      store.setDashboard('s1');
      await vi.waitFor(() => expect(store.getSvg('s1')).toBe(''));
      store.setDashboard('s1');
      await Promise.resolve();

      expect(dashboardsStoreMock.loadSvg).toHaveBeenCalledTimes(1);
      expect(store.svgErrors.has('s1')).toBe(false);
    });
  });

  describe('reloadSvg', () => {
    test('clears the error, shows the loader again, and recovers on a successful refetch', async () => {
      dashboardsStoreMock.dashboardsList = [makeSvgDashboard('s1')];
      dashboardsStoreMock.loadSvg.mockRejectedValueOnce(new Error('404'));

      store.setDashboard('s1');
      await vi.waitFor(() => expect(store.svgErrors.get('s1')).toBe(true));

      dashboardsStoreMock.loadSvg.mockResolvedValue('<svg>s1</svg>');
      store.reloadSvg('s1');

      // Error dropped synchronously -> isSvgLoading true -> the loader shows during the refetch.
      expect(store.svgErrors.has('s1')).toBe(false);
      expect(store.isSvgLoading('s1')).toBe(true);

      await vi.waitFor(() => expect(store.getSvg('s1')).toBe('<svg>s1</svg>'));
      expect(dashboardsStoreMock.loadSvg).toHaveBeenCalledTimes(2);
    });

    test('re-sets the error when the refetch also fails', async () => {
      dashboardsStoreMock.dashboardsList = [makeSvgDashboard('s1')];
      dashboardsStoreMock.loadSvg.mockRejectedValue(new Error('404'));

      store.setDashboard('s1');
      await vi.waitFor(() => expect(store.svgErrors.get('s1')).toBe(true));

      store.reloadSvg('s1');
      await vi.waitFor(() => expect(dashboardsStoreMock.loadSvg).toHaveBeenCalledTimes(2));
      expect(store.svgErrors.get('s1')).toBe(true);
    });
  });

  describe('getSvg', () => {
    test('returns null for an id that has not been loaded', () => {
      expect(store.getSvg('unknown')).toBeNull();
    });
  });

  describe('isSvgLoading', () => {
    test('is true while the fetch is in flight and false once the markup resolves', async () => {
      dashboardsStoreMock.dashboardsList = [makeSvgDashboard('s1')];
      let resolveSvg: (markup: string) => void;
      dashboardsStoreMock.loadSvg.mockReturnValue(
        new Promise<string>((resolve) => {
          resolveSvg = resolve;
        }),
      );

      store.setDashboard('s1');
      expect(store.isSvgLoading('s1')).toBe(true);

      resolveSvg('<svg>s1</svg>');
      await vi.waitFor(() => expect(store.isSvgLoading('s1')).toBe(false));
    });

    test('is false after the fetch fails (the error state is shown instead)', async () => {
      dashboardsStoreMock.dashboardsList = [makeSvgDashboard('s1')];
      dashboardsStoreMock.loadSvg.mockRejectedValue(new Error('404'));

      store.setDashboard('s1');
      await vi.waitFor(() => expect(store.svgErrors.get('s1')).toBe(true));
      expect(store.isSvgLoading('s1')).toBe(false);
    });

    test('is true for a dashboard whose fetch has not started', () => {
      expect(store.isSvgLoading('never-loaded')).toBe(true);
    });

    test('stays reactive: a reaction re-runs when the markup arrives', async () => {
      // The page shows the loader inside an observer, so isSvgLoading must re-evaluate when
      // the markup lands and swap loader -> svg. Assert it actually drives a reaction.
      dashboardsStoreMock.dashboardsList = [makeSvgDashboard('s1')];
      let resolveSvg: (markup: string) => void;
      dashboardsStoreMock.loadSvg.mockReturnValue(
        new Promise<string>((resolve) => {
          resolveSvg = resolve;
        }),
      );

      const seen: boolean[] = [];
      const dispose = reaction(() => store.isSvgLoading('s1'), (loading) => seen.push(loading));

      store.setDashboard('s1');
      resolveSvg('<svg>s1</svg>');

      await vi.waitFor(() => expect(seen).toContain(false));
      dispose();
    });
  });
});
