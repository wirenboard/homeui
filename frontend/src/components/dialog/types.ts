export interface DialogProps {
  isOpened: boolean;
  heading?: string;
  className?: string;
  withPadding?: boolean;
  onClose?: () => void;
}
