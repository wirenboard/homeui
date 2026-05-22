import { type Option } from '@/components/dropdown';

export interface AddPortModalProps {
  isOpened: boolean;
  portOptions: Option<string>[];
  onClose: () => void;
  onSave: (_port: string) => void;
}
