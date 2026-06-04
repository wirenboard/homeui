import { type Option } from '@/components/dropdown';
import { type PortTab } from '../../stores/port-tab-store';

export interface AddDeviceModalProps {
  isOpened: boolean;
  currentPort: PortTab;
  portOptions: Option<string>[];
  deviceOptions: any[];
  onClose: () => void;
  onSave: (_data: { port: string; deviceType: string }) => void;
}
