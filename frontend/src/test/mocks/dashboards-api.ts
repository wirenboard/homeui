import type { Mock } from 'vitest';

export const getDashboardsMock: Mock = vi.fn();
export const getDashboardSvgMock: Mock = vi.fn();
export const saveDashboardsMock: Mock = vi.fn();
export const putDashboardMock: Mock = vi.fn();
export const patchDashboardMock: Mock = vi.fn();
export const deleteDashboardMock: Mock = vi.fn();

export const getDashboards = getDashboardsMock;
export const getDashboardSvg = getDashboardSvgMock;
export const saveDashboards = saveDashboardsMock;
export const putDashboard = putDashboardMock;
export const patchDashboard = patchDashboardMock;
export const deleteDashboard = deleteDashboardMock;
