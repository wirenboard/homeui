import { dashboardsStore } from '@/stores/dashboards';
import { EditSvgDashboardPageStore } from './store';

vi.mock('@/stores/dashboards', () => {
  const Dashboard = class {
    constructor(data: any) {
      Object.assign(this, data);
    }
  };
  return {
    Dashboard,
    dashboardsStore: {
      dashboards: new Map(),
      dashboardsList: [],
      isLoading: false,
      saveError: null as string | null,
      loadSvg: vi.fn(),
      saveSvgDashboard: vi.fn(),
      addDashboard: vi.fn(),
      updateDashboard: vi.fn(),
      deleteDashboard: vi.fn(),
    },
  };
});

describe('EditSvgDashboardPageStore', () => {
  let store: EditSvgDashboardPageStore;

  beforeEach(() => {
    vi.clearAllMocks();
    (dashboardsStore.dashboards as Map<string, any>).clear();
    dashboardsStore.saveError = null;
    (dashboardsStore.loadSvg as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (dashboardsStore.saveSvgDashboard as ReturnType<typeof vi.fn>).mockResolvedValue('ok');
    store = new EditSvgDashboardPageStore();
  });

  test('initializes with default state', () => {
    expect(store.isLoading).toBe(true);
    expect(store.isNew).toBe(true);
    expect(store.commonParameters.id).toBe('');
    expect(store.commonParameters.name).toBe('');
    expect(store.svgStore).toBeDefined();
    expect(store.bindingsStore).toBeDefined();
  });

  test('isValid requires id, name, svg, and a unique id', () => {
    expect(store.isValid).toBeFalsy();
    store.commonParameters.id = 'test';
    store.commonParameters.name = 'Test';
    store.svgStore.setSvg('<svg></svg>');
    expect(store.isValid).toBeTruthy();
  });

  describe('isIdUnique', () => {
    test('is true for an unused id on a new dashboard', () => {
      store.setCommonParam('id', 'fresh');
      expect(store.isIdUnique).toBe(true);
    });

    test('is false when a new dashboard reuses an existing id', () => {
      (dashboardsStore.dashboards as Map<string, any>).set('taken', { id: 'taken' });
      store.setCommonParam('id', 'taken');
      expect(store.isIdUnique).toBe(false);
    });

    test('is true when the editor keeps its own id (originalId)', () => {
      (dashboardsStore.dashboards as Map<string, any>).set('mine', { id: 'mine' });
      store.setOriginalId('mine');
      store.setCommonParam('id', 'mine');
      expect(store.isIdUnique).toBe(true);
    });

    test('is false when renaming onto another dashboard id, blocking isValid', () => {
      (dashboardsStore.dashboards as Map<string, any>).set('mine', { id: 'mine' });
      (dashboardsStore.dashboards as Map<string, any>).set('other', { id: 'other' });
      store.setOriginalId('mine');
      store.setCommonParam('id', 'other');
      store.setCommonParam('name', 'Renamed');
      store.svgStore.setSvg('<svg/>');
      expect(store.isIdUnique).toBe(false);
      expect(store.isValid).toBeFalsy();
    });
  });

  test('setCommonParam updates parameter', () => {
    store.setCommonParam('name', 'New Name');
    expect(store.commonParameters.name).toBe('New Name');
  });

  test('setSwipeParameters updates swipe config', () => {
    store.setSwipeParameters('enable', true);
    expect(store.swipeParameters.enable).toBe(true);
    store.setSwipeParameters('left', 'dash-left');
    expect(store.swipeParameters.left).toBe('dash-left');
  });

  test('setDashboard with null creates new dashboard', () => {
    store.setDashboard(null);
    expect(store.isNew).toBe(true);
    expect(store.isLoading).toBe(false);
    expect(store.dashboard).toBeDefined();
  });

  test('setDashboard with existing id lazily loads the svg markup via dashboardsStore.loadSvg', async () => {
    const dash = {
      id: 'dash1',
      name: 'My SVG',
      isSvg: true,
      svg_fullwidth: true,
      svg: { current: '<svg/>', params: [{ id: 'el1' }], original: {} },
      swipe: { enable: false, left: null, right: null },
      widgets: [],
    };
    (dashboardsStore.dashboards as Map<string, any>).set('dash1', dash);
    (dashboardsStore.loadSvg as ReturnType<typeof vi.fn>).mockResolvedValue('<svg>fetched</svg>');

    await store.setDashboard('dash1');

    expect(dashboardsStore.loadSvg).toHaveBeenCalledWith('dash1');
    expect(store.isNew).toBe(false);
    expect(store.commonParameters.id).toBe('dash1');
    expect(store.commonParameters.name).toBe('My SVG');
    expect(store.svgStore.svg).toBe('<svg>fetched</svg>');
    expect(store.isLoading).toBe(false);
  });

  test('setDashboard leaves the editor empty when the svg fetch fails', async () => {
    const dash = {
      id: 'dash1', name: 'My SVG', isSvg: true, svg_fullwidth: true,
      svg: { current: '<svg/>', params: [], original: {} },
      swipe: { enable: false, left: null, right: null }, widgets: [],
    };
    (dashboardsStore.dashboards as Map<string, any>).set('dash1', dash);
    (dashboardsStore.loadSvg as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('404'));

    await store.setDashboard('dash1');

    expect(store.svgStore.svg).toBeNull();
    expect(store.isLoading).toBe(false);
  });

  test('setDashboard sets svgLoadError when the svg fetch fails', async () => {
    const dash = {
      id: 'd1', name: 'My SVG', isSvg: true, svg_fullwidth: true,
      svg: { current: '<svg/>', params: [], original: {} },
      swipe: { enable: false, left: null, right: null }, widgets: [],
    };
    (dashboardsStore.dashboards as Map<string, any>).set('d1', dash);
    (dashboardsStore.loadSvg as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('404'));

    await store.setDashboard('d1');

    expect(store.svgLoadError).toBe(true);
    expect(store.svgStore.svg).toBeNull();
  });

  test('setDashboard clears svgLoadError on a successful load', async () => {
    const dash = {
      id: 'd1', name: 'My SVG', isSvg: true, svg_fullwidth: true,
      svg: { current: '<svg/>', params: [], original: {} },
      swipe: { enable: false, left: null, right: null }, widgets: [],
    };
    (dashboardsStore.dashboards as Map<string, any>).set('d1', dash);
    store.svgLoadError = true;
    (dashboardsStore.loadSvg as ReturnType<typeof vi.fn>).mockResolvedValue('<svg>ok</svg>');

    await store.setDashboard('d1');

    expect(store.svgLoadError).toBe(false);
  });

  test('setDashboard with null does not fetch svg and leaves the editor empty', async () => {
    await store.setDashboard(null);

    expect(dashboardsStore.loadSvg).not.toHaveBeenCalled();
    expect(store.svgStore.svg).toBeNull();
    expect(store.isLoading).toBe(false);
  });

  test('setOriginalId marks as not new', () => {
    store.setOriginalId('existing');
    expect(store.isNew).toBe(false);
  });

  test('removeDashboard calls store delete', async () => {
    store.setDashboard(null);
    await store.removeDashboard();
    expect(dashboardsStore.deleteDashboard).toHaveBeenCalled();
  });

  test('onSaveDashboard for a new dashboard saves the whole dashboard in one call and returns its id', async () => {
    store.setDashboard(null);
    store.setCommonParam('id', 'new-dash');
    store.setCommonParam('name', 'New');
    store.svgStore.setSvg('<svg>markup</svg>');

    const id = await store.onSaveDashboard();

    expect(dashboardsStore.saveSvgDashboard).toHaveBeenCalledTimes(1);
    const [currentId, dashboard] = (dashboardsStore.saveSvgDashboard as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(currentId).toBe('new-dash');
    expect(dashboard.id).toBe('new-dash');
    expect(dashboard.svg.current).toBe('<svg>markup</svg>');
    expect(dashboard.svg_url).toBe('local');
    expect(id).toBe('new-dash');
  });

  test('onSaveDashboard for an existing dashboard sends the original id as the url id', async () => {
    const dash = {
      id: 'e1', name: 'E', isSvg: true, svg_fullwidth: false,
      svg: { current: '<svg/>', params: [], original: {} },
      swipe: { enable: false, left: null, right: null }, widgets: [],
    };
    (dashboardsStore.dashboards as Map<string, any>).set('e1', dash);
    await store.setDashboard('e1');
    store.svgStore.setSvg('<svg>updated</svg>');

    await store.onSaveDashboard();

    expect(dashboardsStore.saveSvgDashboard).toHaveBeenCalledTimes(1);
    const [currentId, dashboard] = (dashboardsStore.saveSvgDashboard as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(currentId).toBe('e1');
    expect(dashboard.svg.current).toBe('<svg>updated</svg>');
  });

  test('onSaveDashboard for a rename sends the original id as the url id and the new id in the body', async () => {
    const dash = {
      id: 'e1', name: 'E', isSvg: true, svg_fullwidth: false,
      svg: { current: '<svg/>', params: [], original: {} },
      swipe: { enable: false, left: null, right: null }, widgets: [],
    };
    (dashboardsStore.dashboards as Map<string, any>).set('e1', dash);
    await store.setDashboard('e1');
    store.setCommonParam('id', 'e2');
    store.svgStore.setSvg('<svg/>');

    const id = await store.onSaveDashboard();

    const [currentId, dashboard] = (dashboardsStore.saveSvgDashboard as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(currentId).toBe('e1');
    expect(dashboard.id).toBe('e2');
    expect(id).toBe('e2');
  });

  test('onSaveDashboard sets svg_url for new dashboard', async () => {
    store.setDashboard(null);
    store.setCommonParam('id', 'x');
    store.setCommonParam('name', 'X');
    store.svgStore.setSvg('<svg/>');
    await store.onSaveDashboard();
    expect(store.dashboard.svg_url).toBe('local');
  });

  test('setDashboard initializes bindings store params', async () => {
    const dash = {
      id: 'd', name: 'D', isSvg: true, svg_fullwidth: false,
      svg: { current: '<svg/>', params: [{ id: 'el1' }], original: {} },
      swipe: { enable: false, left: null, right: null }, widgets: [],
    };
    (dashboardsStore.dashboards as Map<string, any>).set('d', dash);
    await store.setDashboard('d');
    expect(store.bindingsStore.params).toHaveLength(1);
    expect(store.bindingsStore.params[0].id).toBe('el1');
  });

  test('onSaveDashboard saves swipe parameters', async () => {
    store.setDashboard(null);
    store.setCommonParam('id', 'x');
    store.setCommonParam('name', 'X');
    store.svgStore.setSvg('<svg/>');
    store.setSwipeParameters('enable', true);
    store.setSwipeParameters('left', 'dl');
    await store.onSaveDashboard();
    expect(store.dashboard.swipe.enable).toBe(true);
    expect(store.dashboard.swipe.left).toBe('dl');
  });

  test('onSaveDashboard on a 409 conflict sets idConflictError and returns null (stays on page)', async () => {
    store.setDashboard(null);
    store.setCommonParam('id', 'new-dash');
    store.setCommonParam('name', 'New');
    store.svgStore.setSvg('<svg/>');
    (dashboardsStore.saveSvgDashboard as ReturnType<typeof vi.fn>).mockResolvedValue('conflict');

    const id = await store.onSaveDashboard();

    expect(id).toBeNull();
    expect(store.idConflictError).toBe(true);
  });

  test('onSaveDashboard 409 while renaming an existing dashboard leaves the store map entry untouched', async () => {
    const dash = {
      id: 'e1', name: 'E', isSvg: true, svg_fullwidth: false,
      svg: { current: '<svg>original</svg>', params: [], original: {} },
      swipe: { enable: false, left: null, right: null }, widgets: [],
    };
    (dashboardsStore.dashboards as Map<string, any>).set('e1', dash);
    await store.setDashboard('e1');
    store.setCommonParam('id', 'taken');
    store.setCommonParam('name', 'Renamed');
    store.svgStore.setSvg('<svg>edited</svg>');
    (dashboardsStore.saveSvgDashboard as ReturnType<typeof vi.fn>).mockResolvedValue('conflict');

    const id = await store.onSaveDashboard();

    expect(id).toBeNull();
    expect(store.idConflictError).toBe(true);
    // The live store instance (which onSaveDashboard must NOT mutate before a successful save) is
    // still keyed under its original id with its original id and markup intact.
    const stored = (dashboardsStore.dashboards as Map<string, any>).get('e1');
    expect(stored).toBe(dash);
    expect(stored.id).toBe('e1');
    expect(stored.svg.current).toBe('<svg>original</svg>');
    expect((dashboardsStore.dashboards as Map<string, any>).has('taken')).toBe(false);
  });

  test('onSaveDashboard returns null on an error result without setting idConflictError', async () => {
    store.setDashboard(null);
    store.setCommonParam('id', 'new-dash');
    store.setCommonParam('name', 'New');
    store.svgStore.setSvg('<svg/>');
    (dashboardsStore.saveSvgDashboard as ReturnType<typeof vi.fn>).mockResolvedValue('error');

    const id = await store.onSaveDashboard();

    expect(id).toBeNull();
    expect(store.idConflictError).toBe(false);
  });

  test('editing the id after a conflict clears idConflictError', async () => {
    store.setDashboard(null);
    store.setCommonParam('id', 'new-dash');
    store.setCommonParam('name', 'New');
    store.svgStore.setSvg('<svg/>');
    (dashboardsStore.saveSvgDashboard as ReturnType<typeof vi.fn>).mockResolvedValue('conflict');
    await store.onSaveDashboard();
    expect(store.idConflictError).toBe(true);

    store.setCommonParam('id', 'fixed');

    expect(store.idConflictError).toBe(false);
  });
});
