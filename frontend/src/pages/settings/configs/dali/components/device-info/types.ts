import type { DaliDeviceDescription } from '@/stores/dali/types';

export interface DeviceInfoPanelProps {
  description: DaliDeviceDescription;
}

export type DeviceInfoCompactProps = DeviceInfoPanelProps;

export interface DeviceInfoDialogProps {
  description: DaliDeviceDescription;
  isOpened: boolean;
  onClose: () => void;
}

export interface DeviceInfoField {
  label: string;
  value: string | number;
  className?: string;
}

export type PicturePlacement = 'top' | 'left';
