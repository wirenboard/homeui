import { type DeviceTabStore } from '@/stores/device-manager';
import type { DeviceTypeDropdownOptionGroup } from '@/stores/device-manager/types';
import { type MobileModeTabsStore } from '../../stores/mobile-mode-tabs-store';
import type { PortTab } from '../../stores/port-tab-store';
import type { SettingsTab } from '../../stores/settings-tab-store';

export interface PageTabsProps {
  tabs: (PortTab | SettingsTab | DeviceTabStore)[];
  selectedIndex: number;
  showButtons: boolean;
  deviceTypeSelectOptions: DeviceTypeDropdownOptionGroup[];
  mobileModeStore: MobileModeTabsStore;
  onSelect: (_index: number) => boolean;
  onDeleteTab: () => Promise<void>;
  onDeletePortDevices: (_portTab: PortTab) => Promise<void>;
  onCopyTab: () => Promise<void>;
  onAddPort: () => Promise<void>;
  onDeviceTypeChange: (_tab: DeviceTabStore, _type: string) => Promise<void>;
  onSearchDisconnectedDevice: () => void;
  onUpdateFirmware: () => void;
  onUpdateBootloader: () => void;
  onUpdateComponents: () => void;
  onReadRegisters: (_tab: DeviceTabStore, _isForce: boolean) => void;
}
