import type { CollapseButtonState } from '@/components/collapse-button';
import type { SingleDeviceStore } from '@/pages/settings/device-manager/scan/stores/single-device-store';

export interface DevicesTableProps {
  isScanning: boolean;
  newDevices: SingleDeviceStore[];
  alreadyConfiguredDevices: SingleDeviceStore[];
  collapseButtonState: CollapseButtonState;
  selectionValue: boolean | 'indeterminate';
  toggleSelection: (_val: boolean) => void;
}

export interface AlreadyConfiguredDevicesHeaderProps {
  alreadyConfiguredDevices: SingleDeviceStore[];
  collapseButtonState: CollapseButtonState;
}

export interface DeviceRowProps {
  isScanning: boolean;
  deviceStore: SingleDeviceStore;
}
