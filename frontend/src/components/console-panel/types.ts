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
