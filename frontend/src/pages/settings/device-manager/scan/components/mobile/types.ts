import { type SingleDeviceStore } from '@/pages/settings/device-manager/scan/stores/single-device-store';

export interface DeviceListProps {
  newDevices: SingleDeviceStore[];
  alreadyConfiguredDevices: SingleDeviceStore[];
  selectionValue: boolean | 'indeterminate';
  toggleSelection: (_val: boolean) => void;
}

export interface DevicePanelProps {
  deviceStore: SingleDeviceStore;
}
