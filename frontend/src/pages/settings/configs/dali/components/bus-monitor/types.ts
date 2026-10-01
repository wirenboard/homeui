import type { ReactNode } from 'react';
import type { MonitorStore } from '@/stores/dali/monitor-store';
import type { ParsedBusMonitorLine } from '@/stores/dali/types';

export interface BusMonitorTabProps {
  monitorStore: MonitorStore;
  getLabel: () => string;
}

export interface SequencedBusMonitorFrame {
  /** The row's React key. */
  seq: number;
  frame: ParsedBusMonitorLine;
}

export interface RegisterBusTabParams {
  busId: string;
  monitorStore: MonitorStore;
  getLabel: () => string;
  onClose: () => void;
}

export interface ConsoleMenuProps {
  /** Menu body; `close` collapses the menu (call after acting on an item). */
  renderContent: (_close: () => void) => ReactNode;
}
