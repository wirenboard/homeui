import { ReactElement } from 'react';

export interface ConfirmationProps {
  className?: string;
  isOpened: boolean;
  heading?: string;
  headerActions?: ReactElement;
  confirmCallback: () => Promise<void> | void;
  closeCallback: () => void;
  isDisabled?: boolean;
  isPreventSubmit?: boolean;
  variant?: 'default' | 'danger';
  acceptLabel?: string;
}
