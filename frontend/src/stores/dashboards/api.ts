import { request } from '@/utils/request';
import type { DashboardBase, DashboardsConfig } from './types';

export const getDashboards = (): Promise<DashboardsConfig> =>
  request.get<DashboardsConfig>('/api/dashboards').then(({ data }) => data);

export const getDashboardSvg = (id: string): Promise<string> =>
  request
    .get<string>(`/api/dashboards/${encodeURIComponent(id)}/svg`, { responseType: 'text' })
    .then(({ data }) => data);

export const saveDashboards = (content: DashboardsConfig): Promise<void> =>
  request.put('/api/dashboards', content).then(() => undefined);

export const putDashboard = (id: string, dashboard: DashboardBase): Promise<void> =>
  request.put(`/api/dashboards/${encodeURIComponent(id)}`, dashboard).then(() => undefined);

export const patchDashboard = (id: string, patch: Partial<DashboardBase>): Promise<void> =>
  request.patch(`/api/dashboards/${encodeURIComponent(id)}`, patch).then(() => undefined);

export const deleteDashboard = (id: string): Promise<void> =>
  request.delete(`/api/dashboards/${encodeURIComponent(id)}`).then(() => undefined);
