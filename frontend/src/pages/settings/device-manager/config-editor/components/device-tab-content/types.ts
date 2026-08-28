import { type DeviceTabStore } from '@/stores/device-manager';
import { type DeviceTypeDropdownOptionGroup } from '@/stores/device-manager/types';

export interface DeviceTabContentProps {
  tab: DeviceTabStore;
  deviceTypeSelectOptions: DeviceTypeDropdownOptionGroup[];
  isUserDefinedType?: boolean;
  onDeleteTab: () => void;
  onCopyTab: () => Promise<void>;
  onDeviceTypeChange: (tab: DeviceTabStore, newType: string) => void;
  onSetUniqueMqttTopic: (topic: string) => void;
  onSearchDisconnectedDevice: () => void;
  onUpdateFirmware: () => void;
  onUpdateBootloader: () => void;
  onUpdateComponents: () => void;
  onReadRegisters: (tab: DeviceTabStore, isForce?: boolean) => void;
  onDeleteTemplate?: () => void;
  onUploadTemplate?: () => void;
  templateOperationPending?: boolean;
  templateError?: string;
  onClearTemplateError?: () => void;
}

export interface ReadRegistersResultAlertProps {
  tab: DeviceTabStore;
  onDeviceTypeChange: (tab: DeviceTabStore, newType: string) => void;
  onReadRegisters: (tab: DeviceTabStore) => void;
}
