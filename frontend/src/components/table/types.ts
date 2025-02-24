export interface TableProps {
  isLoading?: boolean;
  isFullWidth?: boolean;
}

export interface TableRowProps {
  url?: string;
}

export interface TableCellProps {
  visibleOnHover?: boolean;
  preventClick?: boolean;
  fitContent?: boolean;
}
