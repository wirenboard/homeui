import { type Cell } from '@/stores/devices';

export interface CellProps {
  cell: Cell;
  name?: string;
  isCompact?: boolean;
  isReadOnly?: boolean;
  // isReadOnly prints the value as text, this keeps the editor and only blocks it.
  isDisabled?: boolean;
  hideHistory?: boolean;
  hideCopy?: boolean;
  isVisible?: boolean;
  extra?: {
    invert?: boolean;
  };
}

export interface CellValueProps {
  cell: Cell;
  hideHistory: boolean;
  hideCopy?: boolean;
  isReadOnly?: boolean;
  isDisabled?: boolean;
}

export interface CellTextProps {
  cell: Cell;
  hideHistory: boolean;
  hideCopy?: boolean;
  isCompact: boolean;
  isReadOnly?: boolean;
  isDisabled?: boolean;
}

export interface CellColorpickerProps {
  cell: Cell;
  hideHistory: boolean;
  isReadOnly?: boolean;
  isDisabled?: boolean;
}

export interface CellAlertProps {
  cell: Cell;
  name?: string;
  hideHistory: boolean;
  hideCopy?: boolean;
}

export interface CellSwitchProps {
  cell: Cell;
  inverted?: boolean;
  hideHistory: boolean;
  isReadOnly?: boolean;
  isDisabled?: boolean;
}

export interface CellButtonProps {
  cell: Cell;
  name?: string;
  hideHistory: boolean;
  isReadOnly?: boolean;
  isDisabled?: boolean;
}

export interface CellRangeProps {
  cell: Cell;
  isReadOnly?: boolean;
  isDisabled?: boolean;
}

export interface CellDateTimeProps {
  cell: Cell;
  hideHistory?: boolean;
  hideCopy?: boolean;
  isReadOnly?: boolean;
  isDisabled?: boolean;
}

export interface CellHistoryProps{
  cell: Cell;
  isVisible?: boolean;
}
