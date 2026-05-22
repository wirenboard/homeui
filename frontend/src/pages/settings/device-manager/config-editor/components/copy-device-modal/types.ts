import { type Option } from '@/components/dropdown';
import { type PortTab } from '../../stores/port-tab-store';

export interface CopyDeviceModalProps {
  isOpened: boolean;
  currentPort: PortTab;
  portOptions: Option<string>[];
  onClose: () => void;
  onCopy: (_data: { port: string; count: number }) => void;
}
