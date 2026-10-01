import { type ReactElement } from 'react';

export type ResponsiveWidth = Record<number, number>;

export interface DrawerProps {
  className?: string;
  isOpened: boolean;
  heading?: string;
  width?: number | ResponsiveWidth;
  headerActions?: ReactElement;
  footerActions?: ReactElement;
  showCloseButton?: boolean;
  isOverlayCloseDisabled?: boolean;
  isDirty?: boolean;
  onClose?: () => void;
}
