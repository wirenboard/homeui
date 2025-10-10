import { HTMLAttributes } from 'react';

export interface TableProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  isLoading?: boolean;
  isFullWidth?: boolean;
  isWithoutGap?: boolean;
}

export interface TableRowProps extends HTMLAttributes<HTMLDivElement | HTMLAnchorElement> {
  className?: string;
  url?: string;
  gap?: number;
  isFullWidth?: boolean;
  isHeading?: boolean;
}

export interface TableCellProps extends HTMLAttributes<HTMLDivElement> {
  width?: number;
  className?: string;
  visibleOnHover?: boolean;
  preventClick?: boolean;
  ellipsis?: boolean;
  isWithoutPadding?: boolean;
  verticalAlign?: 'top' | 'center';
  align?: 'left' | 'center' | 'right';
}
