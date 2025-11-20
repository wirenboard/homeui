import { type Cell } from '@/stores/device';

export interface CellProps {
  cell: Cell;
  name?: string;
  isCompact?: boolean;
  extra?: {
    invert?: boolean;
  };
}
