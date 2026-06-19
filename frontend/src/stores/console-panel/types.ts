import type { ReactNode } from 'react';

export interface ConsoleTab {
  id: string;
  label: string;
  closable?: boolean;
  onClose?: () => void;
  /** Per-tab toolbar (filters + buttons) rendered on the right of the header. */
  renderToolbar?: () => ReactNode;
  /** Per-tab content (the log list). */
  renderContent: () => ReactNode;
}
