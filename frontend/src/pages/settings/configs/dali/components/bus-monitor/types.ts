import { type MonitorStore } from '@/stores/dali';

export interface BusMonitorProps {
  monitorStore: MonitorStore;
  busMonitorEnabled: boolean;
  onToggle: (value: boolean) => Promise<void>;
}
