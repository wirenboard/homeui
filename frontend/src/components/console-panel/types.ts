import type { FunctionComponent, ReactNode } from 'react';

export interface ConsoleIconButtonProps {
  icon: FunctionComponent<any>;
  tooltip: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** A log line with a monotonic id that stays with the line when a capped buffer shifts. */
export interface ConsoleLogRow {
  seq: number;
}

export interface ConsoleLogScrollerProps<T extends ConsoleLogRow> {
  /** Changes whenever the rendered log set changes — drives auto-scroll. */
  scrollKey: number | string;
  /** All rows of the log; only the visible window is rendered. */
  items: T[];
  /** Rough row height (px) used for rows that are not yet measured. */
  estimateRowHeight: number;
  /** Optional fixed content above the rows (e.g. a table header). */
  header?: ReactNode;
  renderRow: (item: T) => ReactNode;
}
