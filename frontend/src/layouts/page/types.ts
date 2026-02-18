import { type ReactElement } from 'react';

export interface ErrorInfo {
  variant?: string;
  text?: string | ReactElement;
  code?: number;
  onClose?: () => void 
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
  titleArea?: ReactElement;
  footer?: ReactElement;
  errors?: ErrorInfo[];
  infoLink?: string;
  onTitleChange?: (_title: string) => void;
  onTitleEditEnable?: () => void;
}
