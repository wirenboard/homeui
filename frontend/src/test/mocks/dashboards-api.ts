export const getDashboardsMock = vi.fn();
export const getDashboardSvgMock = vi.fn();
export const saveDashboardsMock = vi.fn();
export const putDashboardMock = vi.fn();
export const patchDashboardMock = vi.fn();
export const deleteDashboardMock = vi.fn();

export const dashboardsApi = {
  getDashboards: getDashboardsMock,
  getDashboardSvg: getDashboardSvgMock,
  saveDashboards: saveDashboardsMock,
  putDashboard: putDashboardMock,
  patchDashboard: patchDashboardMock,
  deleteDashboard: deleteDashboardMock,
};
