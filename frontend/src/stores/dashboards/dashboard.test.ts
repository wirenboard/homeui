import { Dashboard } from './dashboard';
import type { DashboardBase } from './types';

const dashboardsStoreMock = vi.hoisted(() => ({
  addWidgetToDashboard: vi.fn(),
  deleteDashboard: vi.fn(),
  updateDashboard: vi.fn(),
}));

vi.mock('@/stores/dashboards/index', () => ({ dashboardsStore: dashboardsStoreMock }));

const makeDashboard = (overrides: Partial<DashboardBase> = {}): DashboardBase => ({
  id: 'd1',
  name: 'Main',
  isSvg: false,
  widgets: ['w1', 'w2'],
  ...overrides,
});

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    test('sets basic properties', () => {
      const d = new Dashboard(makeDashboard());
      expect(d.id).toBe('d1');
      expect(d.name).toBe('Main');
      expect(d.widgets).toEqual([['w1', 'w2']]);
      expect(d.isSvg).toBe(false);
      expect(d.options).toEqual({});
    });

    test('defaults widgets to empty array', () => {
      const d = new Dashboard(makeDashboard({ widgets: undefined as any }));
      expect(d.widgets).toEqual([[]]);
    });

    test('sets SVG properties when isSvg is true', () => {
      const svg = { current: '<svg/>', original: {}, params: [] };
      const swipe = { enable: true, left: 'd2', right: null };
      const d = new Dashboard(makeDashboard({
        isSvg: true,
        svg,
        svg_fullwidth: true,
        svg_url: '/img.svg',
        swipe,
      }));

      expect(d.isSvg).toBe(true);
      expect(d.svg).toBe(svg);
      expect(d.svg_fullwidth).toBe(true);
      expect(d.svg_url).toBe('/img.svg');
      expect(d.swipe).toBe(swipe);
    });
  });

  describe('hasWidget', () => {
    test('returns true when widget exists', () => {
      const d = new Dashboard(makeDashboard());
      expect(d.hasWidget('w1')).toBe(true);
    });

    test('returns false when widget does not exist', () => {
      const d = new Dashboard(makeDashboard());
      expect(d.hasWidget('w99')).toBe(false);
    });
  });

  describe('addWidget', () => {
    test('delegates to dashboardsStore', () => {
      const d = new Dashboard(makeDashboard());
      d.addWidget('w3');
      expect(dashboardsStoreMock.addWidgetToDashboard).toHaveBeenCalledWith('d1', 'w3');
    });
  });

  describe('delete', () => {
    test('delegates to dashboardsStore', async () => {
      const d = new Dashboard(makeDashboard());
      await d.delete();
      expect(dashboardsStoreMock.deleteDashboard).toHaveBeenCalledWith('d1');
    });
  });

  describe('toggleVisibility', () => {
    test('sets isHidden to true when not present', async () => {
      const d = new Dashboard(makeDashboard());
      await d.toggleVisibility();
      expect(d.options.isHidden).toBe(true);
      expect(dashboardsStoreMock.updateDashboard).toHaveBeenCalledWith('d1', d);
    });

    test('toggles isHidden when already set', async () => {
      const d = new Dashboard(makeDashboard({ options: { isHidden: true } }));
      await d.toggleVisibility();
      expect(d.options.isHidden).toBe(false);
    });
  });
});
