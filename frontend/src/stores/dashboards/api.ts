import { request } from '@/utils/request';
import type { DashboardBase, DashboardsConfig } from './types';

export const dashboardsApi = {
  getDashboards(): Promise<DashboardsConfig> {
    return request.get<DashboardsConfig>('/api/dashboards').then(({ data }) => data);
  },

  getDashboardSvg(id: string): Promise<string> {
    return request
      .get<string>(`/api/dashboards/${encodeURIComponent(id)}/svg`, { responseType: 'text' })
      .then(({ data }) => data);
  },

  saveDashboards(content: DashboardsConfig): Promise<void> {
    return request.put('/api/dashboards', content).then(() => undefined);
  },

  putDashboard(id: string, dashboard: DashboardBase): Promise<void> {
    return request.put(`/api/dashboards/${encodeURIComponent(id)}`, dashboard).then(() => undefined);
  },

  patchDashboard(id: string, patch: Partial<DashboardBase>): Promise<void> {
    return request.patch(`/api/dashboards/${encodeURIComponent(id)}`, patch).then(() => undefined);
  },

  deleteDashboard(id: string): Promise<void> {
    return request.delete(`/api/dashboards/${encodeURIComponent(id)}`).then(() => undefined);
  },
};
