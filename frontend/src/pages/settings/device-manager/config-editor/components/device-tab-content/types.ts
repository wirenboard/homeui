import { type DeviceTabStore } from '@/stores/device-manager';
import { type DeviceTypeDropdownOptionGroup } from '@/stores/device-manager/types';

export interface DeviceTabContentProps {
  tab: DeviceTabStore;
  onDeleteTab: () => void;
  onCopyTab: () => Promise<void>;
  deviceTypeSelectOptions: DeviceTypeDropdownOptionGroup[];
  onDeviceTypeChange: (tab: DeviceTabStore, newType: string) => void;
  onSetUniqueMqttTopic: (topic: string) => void;
  onSearchDisconnectedDevice: () => void;
  onUpdateFirmware: () => void;
  onUpdateBootloader: () => void;
  onUpdateComponents: () => void;
  onReadRegisters: (tab: DeviceTabStore, isForce?: boolean) => void;
}

export interface ReadRegistersResultAlertProps {
  tab: DeviceTabStore;
  onDeviceTypeChange: (tab: DeviceTabStore, newType: string) => void;
  onReadRegisters: (tab: DeviceTabStore) => void;
}
