import type { FC } from 'react';

export const tabLabel = ({ label }: Pick<ConsoleTab, 'label'>) => (typeof label === 'function' ? label() : label);

export interface ConsoleTab {
  id: string;
  /** A function is called on every render, so a translated label follows the UI language. */
  label: string | (() => string);
  closable?: boolean;
  /** Where the panel goes when this tab is opened by show(), until the user picks a side. */
  preferredPosition?: 'bottom' | 'right';
  onClose?: () => void;
  /** Per-tab toolbar component (filters + buttons) rendered on the right of the header. */
  renderToolbar?: FC;
  /** Per-tab content component (the log list). */
  renderContent: FC;
}
