import { generateNextIdMock } from '@/test/mocks/utils-id';
import type { WidgetBase } from './types';
import { Widget } from './widget';

const dashboardsStoreMock = vi.hoisted(() => ({
  updateWidget: vi.fn(),
  copyWidget: vi.fn(),
  deleteWidget: vi.fn(),
  widgets: new Map<string, { id: string }>(),
  dashboards: new Map<string, { widgets: string[]; isSvg: boolean }>(),
}));

vi.mock('@/stores/dashboards/index', () => ({ dashboardsStore: dashboardsStoreMock }));
vi.mock('@/utils/id', () => import('@/test/mocks/utils-id'));

const makeWidget = (overrides: Partial<WidgetBase> = {}): WidgetBase => ({
  id: 'w1',
  name: 'Temperature',
  description: 'Temp widget',
  compact: false,
  cells: [{ id: 'c1', name: 'cell', extra: {} }],
  ...overrides,
});

describe('Widget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboardsStoreMock.widgets.clear();
    dashboardsStoreMock.dashboards.clear();
  });

  describe('constructor', () => {
    test('sets properties', () => {
      const w = new Widget(makeWidget());
      expect(w.id).toBe('w1');
      expect(w.name).toBe('Temperature');
      expect(w.description).toBe('Temp widget');
      expect(w.compact).toBe(false);
      expect(w.cells).toHaveLength(1);
    });
  });

  describe('save', () => {
    test('delegates to dashboardsStore.updateWidget', () => {
      const w = new Widget(makeWidget());
      const data = makeWidget({ name: 'Updated' });

      w.save(data);

      expect(dashboardsStoreMock.updateWidget).toHaveBeenCalledWith(data);
    });

    test('generates id when data.id is empty', () => {
      dashboardsStoreMock.widgets.set('w1', { id: 'w1' });
      generateNextIdMock.mockReturnValue('widget1');

      const w = new Widget(makeWidget());
      const data = makeWidget({ id: '' });

      w.save(data);

      expect(generateNextIdMock).toHaveBeenCalledWith(['w1'], 'widget');
      expect(data.id).toBe('widget1');
      expect(dashboardsStoreMock.updateWidget).toHaveBeenCalledWith(data);
    });
  });

  describe('copy', () => {
    test('delegates to dashboardsStore.copyWidget', () => {
      const w = new Widget(makeWidget());
      w.copy();
      expect(dashboardsStoreMock.copyWidget).toHaveBeenCalledWith('w1');
    });
  });

  describe('delete', () => {
    test('delegates to dashboardsStore.deleteWidget', () => {
      const w = new Widget(makeWidget());
      w.delete('w1');
      expect(dashboardsStoreMock.deleteWidget).toHaveBeenCalledWith('w1');
    });
  });

  describe('associatedDashboards', () => {
    test('returns dashboards containing this widget', () => {
      dashboardsStoreMock.dashboards.set('d1', { widgets: ['w1', 'w2'], isSvg: false });
      dashboardsStoreMock.dashboards.set('d2', { widgets: ['w3'], isSvg: false });

      const w = new Widget(makeWidget());

      expect(w.associatedDashboards).toHaveLength(1);
      expect(w.associatedDashboards[0].widgets).toContain('w1');
    });
  });

  describe('notUsedDashboards', () => {
    test('returns non-SVG dashboards not containing this widget', () => {
      dashboardsStoreMock.dashboards.set('d1', { widgets: ['w1'], isSvg: false });
      dashboardsStoreMock.dashboards.set('d2', { widgets: ['w3'], isSvg: false });
      dashboardsStoreMock.dashboards.set('d3', { widgets: ['w3'], isSvg: true });

      const w = new Widget(makeWidget());
      const result = w.notUsedDashboards;

      expect(result).toHaveLength(1);
      expect(result[0].widgets).toContain('w3');
      expect(result[0].isSvg).toBe(false);
    });
  });
});
