import { type Connections } from '../../stores/connections-store';
import { type SingleConnection } from '../../stores/single-connection-store';
import type { NetworkType } from '../../stores/types';

export interface ConnectionsEditorProps {
  connections: Connections;
  onToggleState: (_connection: SingleConnection) => void;
  onSelect: (_newIndex: number, _currentIndex: number) => Promise<number | null>;
  onSave: () => Promise<boolean>;
  onAdd: (_connectionType: NetworkType, _currentIndex: number) => Promise<number | null>;
  onDelete: (_connection: SingleConnection) => Promise<void>;
}
