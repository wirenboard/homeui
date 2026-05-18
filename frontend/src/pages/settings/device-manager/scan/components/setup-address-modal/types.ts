import type { ScannedDeviceToModify } from '@/pages/settings/device-manager/scan/stores/types';

export interface SetupAddressModalProps {
  isOpened: boolean;
  devices: ScannedDeviceToModify[];
  onConfirm: (_devices: ScannedDeviceToModify[]) => void;
  onClose: (_cancel: boolean) => void;
}
