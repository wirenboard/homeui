import { type Cell } from '@/stores/devices';

export interface CellProps {
  cell: Cell;
  name?: string;
  isCompact?: boolean;
  isReadOnly?: boolean;
  hideHistory?: boolean;
  extra?: {
    invert?: boolean;
  };
}

export interface CellValueProps {
  cell: Cell;
  hideHistory: boolean;
  isReadOnly?: boolean;
}

export interface CellTextProps {
  cell: Cell;
  hideHistory: boolean;
  isCompact: boolean;
  isReadOnly?: boolean;
}

export interface CellColorpickerProps {
  cell: Cell;
  hideHistory: boolean;
  isReadOnly?: boolean;
}

export interface CellAlertProps {
  cell: Cell;
  name?: string;
  hideHistory: boolean;
}

export interface CellSwitchProps {
  cell: Cell;
  inverted?: boolean;
  hideHistory: boolean;
  isReadOnly?: boolean;
}

export interface CellButtonProps {
  cell: Cell;
  name?: string;
  hideHistory: boolean;
  isReadOnly?: boolean;
}

export interface CellRangeProps {
  cell: Cell;
  isReadOnly?: boolean;
}

export interface CellDateTimeProps {
  cell: Cell;
  isReadOnly?: boolean;
}

export interface CellHistoryProps{
  cell: Cell;
  isVisible?: boolean;
}
