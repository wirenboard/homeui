import { DeviceTabStore } from '@/stores/device-manager';

export interface DeviceTabContentProps {
  tab: DeviceTabStore;
  onDeleteTab: () => void;
  onCopyTab: () => void;
  deviceTypeSelectOptions: Array<{ value: string; label: string }>;
  onDeviceTypeChange: (tab: DeviceTabStore, newType: string) => void;
  onSetUniqueMqttTopic: (topic: string) => void;
  onSearchDisconnectedDevice: () => void;
  onUpdateFirmware: () => void;
  onUpdateBootloader: () => void;
  onUpdateComponents: () => void;
  onReadRegisters: (tab: DeviceTabStore) => void;
}

export interface ReadRegistersResultAlertProps {
  tab: DeviceTabStore;
  onDeviceTypeChange: (tab: DeviceTabStore, newType: string) => void;
  onReadRegisters: (tab: DeviceTabStore) => void;
}
