import { type DevicesStore } from '@/stores/devices';

export interface SelectControlProps {
  isOpen: boolean;
  configuredControls: string[];
  devicesStore: DevicesStore;
  onConfirm: (selectedControls: string[]) => void;
  onClose: () => void;
}

export interface ControlNode {
  id: string;
  name: string;
  mqttId: string;
  children?: ControlNode[];
}
