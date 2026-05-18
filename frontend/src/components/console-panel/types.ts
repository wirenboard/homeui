import type { ConsolePanelStore } from '@/stores/console-panel';

export interface ConsolePanelProps {
  store: ConsolePanelStore;
  onPositionChange: (position: 'bottom' | 'right') => void;
}
