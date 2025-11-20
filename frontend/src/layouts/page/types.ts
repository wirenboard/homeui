import { ReactElement } from 'react';

export interface PageProps {
  title: string;
  isEditingTitle?: boolean;
  editingTitlePlaceholder?: string;
  hasRights: boolean;
  isLoading?: boolean;
  isHideHeader?: boolean;
  stickyHeader?: boolean;
  actions?: ReactElement;
  errors?: { variant?: string; text?: string; code?: number }[];
  infoLink?: string;
  onTitleChange?: (_title: string) => void;
  onTitleEditEnable?: () => void;
}
