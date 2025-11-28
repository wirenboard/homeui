export interface TreeProps {
  data: TreeItem[];
  isDisabled?: boolean;
  onItemClick?: (item: TreeItem) => void;
}

export interface TreeItem {
  id: string;
  label: string;
  children?: TreeItem[];
}
