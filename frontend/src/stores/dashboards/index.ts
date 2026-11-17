import DashboardsStore from './dashboards-store';

export { Dashboard } from './dashboard';
export { Widget } from './widget';
export * from './types';

const dashboardsStore = new DashboardsStore();

export {
  DashboardsStore,
  dashboardsStore
};
