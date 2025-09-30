import { ReactElement } from 'react';

export interface DialogProps {
  className?: string;
  isOpened: boolean;
  heading?: string;
  width?: number;
  headerActions?: ReactElement;
  showCloseButton?: boolean;
  isOverlayCloseDisabled?: boolean;
  withPadding?: boolean;
  onClose?: () => void;
}
