import { type FirmwareUpdateStore } from '../../store';
import { type ModalMode } from '../../types';

export interface FactoryResetModalProps {
  isOpened: boolean;
  onCancel: () => void;
  mode: ModalMode;
  store: FirmwareUpdateStore;
}
