import { ReactElement } from 'react';

export interface DialogProps {
  className?: string;
  isOpened: boolean;
  heading?: string;
  headerActions?: ReactElement;
  showCloseButton?: boolean;
  withPadding?: boolean;
  onClose?: () => void;
}
