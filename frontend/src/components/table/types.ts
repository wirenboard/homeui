import { type HTMLAttributes } from 'react';

export type TableCellSortDirection = 'asc' | 'desc';

export interface TableCellSort {
  onSort: () => void;
  isActive?: boolean;
  direction?: TableCellSortDirection;
}

export interface TableProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  isLoading?: boolean;
  isFullWidth?: boolean;
  isWithoutGap?: boolean;
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  className?: string;
  url?: string;
  isFullWidth?: boolean;
  isHeading?: boolean;
  isSticky?: boolean;
}

export interface TableCellProps extends HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  className?: string;
  visibleOnHover?: boolean;
  preventClick?: boolean;
  ellipsis?: boolean;
  isWithoutPadding?: boolean;
  isDraggable?: boolean;
  verticalAlign?: 'top' | 'center';
  align?: 'left' | 'center' | 'right';
  sort?: TableCellSort;
  url?: string;
}
