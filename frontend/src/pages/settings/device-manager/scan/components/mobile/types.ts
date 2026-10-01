import { type SingleDeviceStore } from '@/pages/settings/device-manager/scan/stores/single-device-store';

export interface DeviceListProps {
  isScanning: boolean;
  newDevices: SingleDeviceStore[];
  alreadyConfiguredDevices: SingleDeviceStore[];
  selectionValue: boolean | 'indeterminate';
  toggleSelection: (_val: boolean) => void;
}

export interface DevicePanelProps {
  isScanning: boolean;
  deviceStore: SingleDeviceStore;
}
