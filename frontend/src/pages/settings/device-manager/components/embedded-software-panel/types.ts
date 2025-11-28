import { EmbeddedSoftware } from '@/stores/device-manager';

export interface EmbeddedSoftwarePanelProps {
  embeddedSoftware: EmbeddedSoftware;
  onUpdateFirmware: () => void;
  onUpdateBootloader: () => void;
  onUpdateComponents: () => void;
}

export interface HasUpdateAlertProps {
  embeddedSoftware: EmbeddedSoftware;
  onUpdateFirmware: () => void;
  onUpdateBootloader: () => void;
  onUpdateComponents: () => void;
}
