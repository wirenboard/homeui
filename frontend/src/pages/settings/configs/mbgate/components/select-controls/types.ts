import { type RegisterTypeSelection } from '@/pages/settings/configs/mbgate/stores/types';
import { type DevicesStore } from '@/stores/devices';

export interface SelectControlProps {
  isOpen: boolean;
  configuredControls: string[];
  devicesStore: DevicesStore;
  onConfirm: (selectedControls: string[], registerType: RegisterTypeSelection) => void;
  onClose: () => void;
}

export interface ControlNode {
  id: string;
  name: string;
  mqttId: string;
  children?: ControlNode[];
}
