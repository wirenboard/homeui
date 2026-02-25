import { type DevicesStore } from '@/stores/devices';

export interface SmartDeviceProps {
  id?: string;
  devicesStore: DevicesStore;
  onSave: (_id: string) => void;
  onDelete: () => void;
  onOpenDevice: (_id: string) => void;
}
