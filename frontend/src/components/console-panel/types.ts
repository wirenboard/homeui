import type { FunctionComponent, ReactNode } from 'react';

export interface ConsoleIconButtonProps {
  icon: FunctionComponent<any>;
  tooltip: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface ConsoleLogScrollerProps {
  /** Changes whenever the rendered log set changes — drives auto-scroll. */
  scrollKey: number | string;
  children: ReactNode;
}

export interface ConsolePanelProps {
  /** Shown in the content area while no tab is registered — an open panel with
      nothing to say otherwise reads as a rendering bug. */
  emptyState?: ReactNode;
}
