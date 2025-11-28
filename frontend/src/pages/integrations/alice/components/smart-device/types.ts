import { type DeviceStore } from '@/stores/device';

export interface SmartDeviceParams {
  id?: string;
  deviceStore: DeviceStore;
  onSave: (_id: string) => void;
  onDelete: () => void;
  onOpenDevice: (_id: string) => void;
}
