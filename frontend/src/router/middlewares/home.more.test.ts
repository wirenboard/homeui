vi.mock('mobx', async () => {
  const actual = await vi.importActual('mobx');
  return { ...actual, when: vi.fn((_pred) => Promise.resolve()) };
});
vi.mock('@/stores/dashboards', () => ({
  dashboardsStore: {
    isLoading: false,
    defaultDashboardId: null as string | null,
    dashboards: new Map(),
  },
}));

import { dashboardsStore } from '@/stores/dashboards';
import { homeRedirect } from './home';

describe('homeRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (dashboardsStore as any).defaultDashboardId = null;
    (dashboardsStore.dashboards as Map<string, any>).clear();
  });

  test('redirects to /dashboards when no default', async () => {
    await expect(homeRedirect({} as any, vi.fn())).rejects.toEqual(
      expect.objectContaining({ status: 302 }),
    );
  });

  test('redirects to default dashboard', async () => {
    (dashboardsStore as any).defaultDashboardId = 'dash1';
    dashboardsStore.dashboards.set('dash1', { isSvg: false } as any);

    try {
      await homeRedirect({} as any, vi.fn());
    } catch (e: any) {
      expect(e.headers.get('Location')).toContain('/dashboards/dash1');
    }
  });

  test('redirects to SVG dashboard when default is SVG', async () => {
    (dashboardsStore as any).defaultDashboardId = 'svg1';
    dashboardsStore.dashboards.set('svg1', { isSvg: true } as any);

    try {
      await homeRedirect({} as any, vi.fn());
    } catch (e: any) {
      expect(e.headers.get('Location')).toContain('/dashboards/svg/view/svg1');
    }
  });
});
