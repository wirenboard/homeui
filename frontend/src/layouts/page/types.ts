import { ReactElement } from 'react';

export interface PageProps {
  title: string;
  isEditingTitle?: boolean;
  editingTitlePlaceholder?: string;
  hasRights: boolean;
  isLoading?: boolean;
  stickyHeader?: boolean;
  actions?: ReactElement;
  errors?: { variant?: string; text?: string; code?: number }[];
  onTitleChange?: (_title: string) => void;
  onTitleEditEnable?: () => void;
}
