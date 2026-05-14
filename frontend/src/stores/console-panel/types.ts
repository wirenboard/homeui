import type { FunctionComponent, ReactNode } from 'react';
import type { Option } from '@/components/dropdown';

export interface ConsoleTabAction {
  id: string;
  icon: FunctionComponent<any>;
  tooltip: string;
  isActive?: () => boolean;
  onClick: () => void;
}

export interface ConsoleTab {
  id: string;
  label: string;
  getLogs: () => any[];
  filterLevels?: Option[];
  getLogLevel?: (log: any) => string;
  renderLog: (log: any, index: number) => ReactNode;
  actions?: ConsoleTabAction[];
  clearLogs: () => void;
  closable?: boolean;
}
