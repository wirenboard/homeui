export interface ConfirmationProps {
  isOpened: boolean;
  heading?: string;
  confirmCallback: () => Promise<void> | void;
  closeCallback: () => void;
  variant?: 'default' | 'danger';
}
