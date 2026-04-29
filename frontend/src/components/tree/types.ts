import type { ReactNode } from 'react';

export interface TreeProps {
  data: TreeItem[];
  size?: 'default' | 'small';
  isDisabled?: boolean;
  onItemClick?: (item: TreeItem) => void;
  // If `activeId` is provided, the highlighted item is controlled by the parent
  // (update it from `onItemClick` to keep clicks responsive, and change it
  // independently when selection moves without a click). If omitted, the tree
  // manages highlight internally and defaults to the first item.
  activeId?: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export interface TreeItem {
  id: string;
  label: string | ReactNode;
  children?: TreeItem[];
}
