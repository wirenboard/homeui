import { type ScannedDevice } from '@/stores/device-manager/types';

export interface SetupAddressModalProps {
  isOpened: boolean;
  devices: ScannedDevice[];
  onConfirm: (_devices: ScannedDevice[]) => void;
  onClose: (_cancel: boolean) => void;
}
