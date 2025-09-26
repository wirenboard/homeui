import { ReactElement } from 'react';

export interface ConfirmationProps {
  className?: string;
  isOpened: boolean;
  heading?: string;
  width?: number;
  headerActions?: ReactElement;
  confirmCallback: () => Promise<void> | void;
  closeCallback: () => void;
  isDisabled?: boolean;
  isPreventSubmit?: boolean;
  isOverlayCloseDisabled?: boolean;
  variant?: 'default' | 'danger';
  acceptLabel?: string;
}
