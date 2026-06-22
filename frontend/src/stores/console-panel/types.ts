import type { FC } from 'react';

export interface ConsoleTab {
  id: string;
  label: string;
  closable?: boolean;
  onClose?: () => void;
  /** Per-tab toolbar component (filters + buttons) rendered on the right of the header. */
  renderToolbar?: FC;
  /** Per-tab content component (the log list). */
  renderContent: FC;
}
