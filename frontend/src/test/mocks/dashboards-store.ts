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
  dashboardsList: [] as any[],
  loadData: vi.fn(),
  addDashboard: vi.fn(),
  updateDashboard: vi.fn(),
  updateDashboards: vi.fn(),
  deleteDashboard: vi.fn(),
  addWidgetToDashboard: vi.fn(),
  removeWidgetFromDashboard: vi.fn(),
  copyWidget: vi.fn(),
  updateWidget: vi.fn(),
  deleteWidget: vi.fn(),
  setLoading: vi.fn(),
  setDefaultDashboardId: vi.fn(),
  setIsShowWidgetsPage: vi.fn(),
  setDescription: vi.fn(),
};

export { dashboardsStoreMock as dashboardsStore };
