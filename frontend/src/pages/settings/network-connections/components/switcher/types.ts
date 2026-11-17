import { type SingleConnection } from '../../stores/single-connection-store';
import { type ConnectionPrioritiesStore, type SwitcherStore } from '../../stores/switcher-store';

export interface SwitcherProps {
  onSave: () => Promise<boolean>;
  switcher: SwitcherStore;
}

export enum TierLevel {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

export interface Tier {
  name: 'Высокий приоритет';
  connections: SingleConnection[];
  id: TierLevel;
}

export interface SwitcherColumnProps {
  tier: Tier;
  moveLeft: (_connection: SingleConnection, _tier: Tier) => void;
  moveRight: (_connection: SingleConnection, _tier: Tier) => void;
}

export interface ConnectionPrioritiesEditorProps {
  store: ConnectionPrioritiesStore;
}
