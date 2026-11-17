import { type DeviceTabStore } from '@/stores/device-manager';
import { type PortTab } from '../../stores/port-tab-store';
import { type SettingsTab } from '../../stores/settings-tab-store';

export interface DeleteModalProps {
  isOpened: boolean;
  selectedTab: PortTab | DeviceTabStore | SettingsTab;
  onClose: () => void;
  onDelete: (_val: boolean) => void;
}
