import { HTMLAttributes } from 'react';

export interface TableProps extends HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
  isFullWidth?: boolean;
}

export interface TableRowProps extends HTMLAttributes<HTMLDivElement | HTMLAnchorElement> {
  url?: string;
  isFullWidth?: boolean;
}

export interface TableCellProps extends HTMLAttributes<HTMLDivElement> {
  width?: number;
  visibleOnHover?: boolean;
  preventClick?: boolean;
  ellipsis?: boolean;
}
