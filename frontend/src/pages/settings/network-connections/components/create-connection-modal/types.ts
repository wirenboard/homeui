import { type NetworkType } from '../../stores/types';

export interface CreateConnectionModalProps {
  isOpened: boolean;
  onClose: () => void;
  onCreate: (_connection: NetworkType) => void;
}
