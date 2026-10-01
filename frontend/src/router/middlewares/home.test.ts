import { redirect } from 'react-router';
import { dashboardsStoreMock } from '@/test/mocks/dashboards-store';
import { homeRedirect } from './home';

vi.mock('react-router', () => ({
  redirect: vi.fn((url: string) => ({ __redirect: url })),
}));
vi.mock('mobx', () => ({
  when: vi.fn((predicate: () => boolean) => {
    predicate();
    return Promise.resolve();
  }),
}));
vi.mock('@/stores/dashboards', () => import('@/test/mocks/dashboards-store'));

describe('homeRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboardsStoreMock.defaultDashboardId = undefined;
    dashboardsStoreMock.dashboards.clear();
  });

  test('redirects to default dashboard', async () => {
    dashboardsStoreMock.defaultDashboardId = 'main';
    dashboardsStoreMock.dashboards.set('main', { isSvg: false });

    await expect(homeRedirect({} as any, vi.fn() as any)).rejects.toEqual({
      __redirect: '/dashboards/main',
    });
    expect(redirect).toHaveBeenCalledWith('/dashboards/main');
  });

  test('redirects to SVG dashboard view for SVG dashboards', async () => {
    dashboardsStoreMock.defaultDashboardId = 'svg-1';
    dashboardsStoreMock.dashboards.set('svg-1', { isSvg: true });

    await expect(homeRedirect({} as any, vi.fn() as any)).rejects.toEqual({
      __redirect: '/dashboards/svg/view/svg-1',
    });
    expect(redirect).toHaveBeenCalledWith('/dashboards/svg/view/svg-1');
  });

  test('redirects to /dashboards when no default dashboard', async () => {
    await expect(homeRedirect({} as any, vi.fn() as any)).rejects.toEqual({
      __redirect: '/dashboards',
    });
    expect(redirect).toHaveBeenCalledWith('/dashboards');
  });

  test('redirects to /dashboards when default ID is set but not found', async () => {
    dashboardsStoreMock.defaultDashboardId = 'deleted';

    await expect(homeRedirect({} as any, vi.fn() as any)).rejects.toEqual({
      __redirect: '/dashboards',
    });
    expect(redirect).toHaveBeenCalledWith('/dashboards');
  });
});
