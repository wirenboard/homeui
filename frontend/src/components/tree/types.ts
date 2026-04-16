import type { ReactNode } from 'react';

export interface TreeProps {
  data: TreeItem[];
  size?: 'default' | 'small';
  isDisabled?: boolean;
  onItemClick?: (item: TreeItem) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export interface TreeItem {
  id: string;
  label: string | ReactNode;
  children?: TreeItem[];
}
