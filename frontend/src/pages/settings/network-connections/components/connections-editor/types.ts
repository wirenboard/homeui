import { type Connections } from '../../stores/connections-store';
import { type SingleConnection } from '../../stores/single-connection-store';
import type { NetworkType } from '../../stores/types';

export interface ConnectionsEditorProps {
  connections: Connections;
  onToggleState: (_connection: SingleConnection) => void;
  onSelect: (_index: number) => Promise<boolean>;
  onSave: () => void;
  onAdd: (_connectionType: NetworkType) => void;
  onDelete: (_connection: SingleConnection) => void;
}
