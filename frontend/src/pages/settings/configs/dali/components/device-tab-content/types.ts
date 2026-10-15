export type ResetMode = 'settings' | 'full';

export interface ResetConfirmProps {
  isOpened: boolean;
  isLoading: boolean;
  isDirty: boolean;
  onConfirm: (mode: ResetMode) => Promise<void>;
  closeCallback: () => void;
}

/** The slice of an instanceN config block the event-scheme guard reads. */
export interface InstanceConfig {
  event_scheme?: number;
}
