export type ResetMode = 'settings' | 'full';

export interface ResetConfirmProps {
  isOpened: boolean;
  isLoading: boolean;
  isDirty: boolean;
  onConfirm: (mode: ResetMode) => Promise<void>;
  closeCallback: () => void;
}
