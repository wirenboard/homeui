import { type Option } from '@/components/dropdown';
import { type DeviceTabStore } from '@/stores/device-manager';
import { type PortTab } from '../../stores/port-tab-store';

export interface MoveDeviceModalProps {
  isOpened: boolean;
  currentPort: PortTab;
  devices: DeviceTabStore[];
  portOptions: Option<string>[];
  onClose: () => void;
  onMove: (_assignments: Map<DeviceTabStore, string>) => void;
}

export interface SingleDeviceMoveProps {
  isOpened: boolean;
  device: DeviceTabStore;
  targetPortOptions: Option<string>[];
  onClose: () => void;
  onMove: (_assignments: Map<DeviceTabStore, string>) => void;
}

export interface BulkDevicesMoveProps {
  isOpened: boolean;
  currentPort: PortTab;
  devices: DeviceTabStore[];
  targetPortOptions: Option<string>[];
  onClose: () => void;
  onMove: (_assignments: Map<DeviceTabStore, string>) => void;
}
