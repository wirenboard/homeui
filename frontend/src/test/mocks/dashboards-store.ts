import type { Mock } from 'vitest';

export class Dashboard {}
export class Widget {}
export class DashboardsStore {}

export const dashboardsStoreMock = {
  dashboards: new Map<string, { isSvg: boolean }>(),
  widgets: new Map(),
  isLoading: false,
  description: '',
  defaultDashboardId: undefined as string | undefined,
  isShowWidgetsPage: false,
  saveError: null as string | null,
  loadError: null as string | null,
  dashboardsList: [] as any[],
  loadData: vi.fn() as Mock,
  loadSvg: vi.fn() as Mock,
  saveSvgDashboard: vi.fn() as Mock,
  addDashboard: vi.fn() as Mock,
  updateDashboard: vi.fn() as Mock,
  updateDashboards: vi.fn() as Mock,
  deleteDashboard: vi.fn() as Mock,
  setDashboardHidden: vi.fn() as Mock,
  addWidgetToDashboard: vi.fn() as Mock,
  removeWidgetFromDashboard: vi.fn() as Mock,
  copyWidget: vi.fn() as Mock,
  updateWidget: vi.fn() as Mock,
  deleteWidget: vi.fn() as Mock,
  setLoading: vi.fn() as Mock,
  setDefaultDashboardId: vi.fn() as Mock,
  setIsShowWidgetsPage: vi.fn() as Mock,
  setDescription: vi.fn() as Mock,
};

export { dashboardsStoreMock as dashboardsStore };
