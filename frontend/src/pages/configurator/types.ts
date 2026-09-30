import { type DeviceDraft } from '@/stores/configurator';
import { type Cell } from '@/stores/devices';

export type RoleKind =
  | 'measurement'
  | 'accumulation'
  | 'binary_state'
  | 'level'
  | 'enumeration'
  | 'color'
  | 'event'
  | 'command'
  | 'text'
  | 'unknown';

export type Access = 'read' | 'readwrite';

export type ValueType = 'bool' | 'number' | 'string' | 'color';

export interface InferredRole {
  role: string;
  kind: RoleKind;
}

// Словарь роли: вид, тип значения, доступ и нейтральная шкала. Источник kind/value_type/unit —
// роль (а не хранится в конфиге). Зеркало contract/get_catalog.json (roles).
export interface RoleDef {
  kind: RoleKind;
  value_type: ValueType;
  access: Access;
  unit?: string;
  range?: Range;
  // true — фиксированная шкала (яркость/позиция 0–100): range нейтральный, сырые границы → scale.
  fixedScale?: boolean;
}

// Тип устройства из каталога: набор слотов (ролей). kind/access живут в словаре роли.
export interface TypeSlot {
  role: string;
  required: boolean;
  // условная обязательность: если этот слот привязан, перечисленные роли тоже обязательны
  requires?: string[];
}

export interface DeviceType {
  id: string;
  name: {
    ru: string;
    en: string;
  };
  slots: TypeSlot[];
}

export interface Range {
  min: number;
  max: number;
  step: number;
}

export type TransformSpec =
  | { type: 'boolean' }
  | { type: 'rgb_hs' }
  | { type: 'scale'; from: { min: number; max: number }; to: { min: number; max: number } };

export interface ConfigBinding {
  state: string;
  command?: string;
  transform?: TransformSpec;
}

// Плоская модель: устройство (did/type/module) → сервис (sid/role/binding).
export interface ConfigService {
  sid: number;
  role: string;
  name?: string;
  range?: Range;
  binding: ConfigBinding;
}

export interface ConfigDevice {
  did: number;
  name: string;
  type: string;
  module: string;
  area?: string;
  adapter_settings?: Record<string, boolean>;
  services: ConfigService[];
}

export interface Config {
  version: string;
  devices: ConfigDevice[];
}

export type BackendState = 'checking' | 'available' | 'unavailable';

export interface PreviewStatus {
  variant: 'success' | 'danger';
  text: string;
}

export interface ConfigPreviewProps {
  yaml: string;
  deviceCount: number;
  status: PreviewStatus | null;
  backendState: BackendState;
  isSaving: boolean;
  onSave: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onStatusClose: () => void;
}

export interface DeviceCardProps {
  device: DeviceDraft;
  type: DeviceType;
  typeName: string;
  roleLabel: (_role: string) => string;
  allCells: Cell[];
  cellById: Map<string, Cell>;
  onDelete: (_device: DeviceDraft) => void;
}

export interface DiscoveryPanelProps {
  boundCellIds: Set<string>;
  typeLabel: (_id: string) => string;
  roleLabel: (_role: string) => string;
}
