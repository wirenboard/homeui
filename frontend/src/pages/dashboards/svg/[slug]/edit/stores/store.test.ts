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

  test('isValid requires id, name, and svg', () => {
    expect(store.isValid).toBeFalsy();
    store.commonParameters.id = 'test';
    store.commonParameters.name = 'Test';
    store.svgStore.setSvg('<svg></svg>');
    expect(store.isValid).toBeTruthy();
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

  test('setDashboard with existing id loads dashboard', () => {
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

    store.setDashboard('dash1');
    expect(store.isNew).toBe(false);
    expect(store.commonParameters.id).toBe('dash1');
    expect(store.commonParameters.name).toBe('My SVG');
    expect(store.svgStore.svg).toBe('<svg/>');
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

  test('onSaveDashboard for new dashboard calls addDashboard', async () => {
    store.setDashboard(null);
    store.setCommonParam('id', 'new-dash');
    store.setCommonParam('name', 'New');
    store.svgStore.setSvg('<svg/>');

    const id = await store.onSaveDashboard();
    expect(dashboardsStore.addDashboard).toHaveBeenCalled();
    expect(id).toBe('new-dash');
  });

  test('onSaveDashboard for existing calls updateDashboard', async () => {
    const dash = {
      id: 'e1', name: 'E', isSvg: true, svg_fullwidth: false,
      svg: { current: '<svg/>', params: [], original: {} },
      swipe: { enable: false, left: null, right: null }, widgets: [],
    };
    (dashboardsStore.dashboards as Map<string, any>).set('e1', dash);
    store.setDashboard('e1');
    store.svgStore.setSvg('<svg>updated</svg>');

    await store.onSaveDashboard();
    expect(dashboardsStore.updateDashboard).toHaveBeenCalledWith('e1', expect.anything());
  });

  test('onSaveDashboard sets svg_url for new dashboard', async () => {
    store.setDashboard(null);
    store.setCommonParam('id', 'x');
    store.setCommonParam('name', 'X');
    store.svgStore.setSvg('<svg/>');
    await store.onSaveDashboard();
    expect(store.dashboard.svg_url).toBe('local');
  });

  test('setDashboard initializes bindings store params', () => {
    const dash = {
      id: 'd', name: 'D', isSvg: true, svg_fullwidth: false,
      svg: { current: '<svg/>', params: [{ id: 'el1' }], original: {} },
      swipe: { enable: false, left: null, right: null }, widgets: [],
    };
    (dashboardsStore.dashboards as Map<string, any>).set('d', dash);
    store.setDashboard('d');
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
});
