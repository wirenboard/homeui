import { type DashboardsStore } from '@/stores/dashboards';
import { type DevicesStore } from '@/stores/devices';

export interface HistoryPageProps {
  historyProxy: { get_values: (params: Record<string, unknown>) => Promise<{ values: any[] }> };
  dashboardsStore: DashboardsStore;
  devicesStore: DevicesStore;
  $state: { go: (name: string, params: Record<string, unknown>, options?: Record<string, unknown>) => void };
}
