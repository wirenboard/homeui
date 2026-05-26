import { when } from 'mobx';
import { redirect, type MiddlewareFunction } from 'react-router';
import { dashboardsStore } from '@/stores/dashboards';

export const homeRedirect: MiddlewareFunction = async () => {
  await when(() => !dashboardsStore.isLoading);

  const { defaultDashboardId, dashboards } = dashboardsStore;
  const dashboard = defaultDashboardId ? dashboards.get(defaultDashboardId) : undefined;

  if (dashboard) {
    throw redirect(
      dashboard.isSvg
        ? `/dashboards/svg/view/${defaultDashboardId}`
        : `/dashboards/${defaultDashboardId}`,
    );
  }

  throw redirect('/dashboards');
};
