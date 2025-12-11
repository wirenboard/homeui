import { type ReactElement } from 'react';

export interface ErrorInfo {
  text: string;
  variant?: string;
  code?: number;
}

export interface PageProps {
  title: string;
  isEditingTitle?: boolean;
  editingTitlePlaceholder?: string;
  hasRights: boolean;
  isLoading?: boolean;
  isHideHeader?: boolean;
  stickyHeader?: boolean;
  actions?: ReactElement;
  errors?: ErrorInfo[];
  infoLink?: string;
  onTitleChange?: (_title: string) => void;
  onTitleEditEnable?: () => void;
}
