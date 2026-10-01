import { type PortTab as PortTabStore } from '../../stores/port-tab-store';

export interface PortTabProps {
  tab: PortTabStore;
}

export interface PortTabContentProps {
  tab: PortTabStore;
  deleteTab: (_tab: PortTabStore) => Promise<void>;
  onDeletePortDevices: (_tab: PortTabStore) => Promise<void>;
}
