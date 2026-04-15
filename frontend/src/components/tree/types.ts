import type { ReactNode } from 'react';

export interface TreeProps {
  data: TreeItem[];
  isDisabled?: boolean;
  onItemClick?: (item: TreeItem) => void;
}

export interface TreeItem {
  id: string;
  label: string | ReactNode;
  children?: TreeItem[];
}
