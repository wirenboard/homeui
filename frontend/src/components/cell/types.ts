import { type Cell } from '@/stores/device';

export interface CellProps {
  cell: Cell;
  name?: string;
  isCompact?: boolean;
  hideHistory?: boolean;
  extra?: {
    invert?: boolean;
  };
}

export interface CellValueProps {
  cell: Cell;
  hideHistory: boolean;
}

export interface CellTextProps {
  cell: Cell;
  hideHistory: boolean;
  isCompact: boolean;
}

export interface CellColorpickerProps {
  cell: Cell;
  hideHistory: boolean;
}

export interface CellAlertProps {
  cell: Cell;
  hideHistory: boolean;
}

export interface CellSwitchProps {
  cell: Cell;
  inverted?: boolean;
  hideHistory: boolean;
}

export interface CellButtonProps {
  cell: Cell;
  name?: string;
  hideHistory: boolean;
}

export interface CellRangeProps {
  cell: Cell;
}

export interface CellHistoryProps{
  cell: Cell;
  isVisible?: boolean;
}
