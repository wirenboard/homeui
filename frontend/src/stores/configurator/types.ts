export type RoleId =
  | 'on_off'
  | 'brightness'
  | 'color_temperature'
  | 'color'
  | 'position'
  | 'temperature'
  | 'humidity'
  | 'co2'
  | 'illuminance'
  | 'leak'
  | 'contact'
  | 'motion'
  | 'occupancy'
  | 'smoke'
  | 'power'
  | 'energy'
  | 'press';

export interface RoleDef {
  rw?: boolean;
  bool?: boolean;
  scale?: boolean;
}

export type TypeCategory = 'control' | 'sensors' | 'energy';

export interface DeviceTypeDef {
  id: string;
  category: TypeCategory;
  // [роль, обязательна]
  roles: [RoleId, boolean][];
}

export type ChannelClass =
  | 'bin_rw'
  | 'bin_r'
  | 'level'
  | 'temp'
  | 'hum'
  | 'co2'
  | 'lux'
  | 'power'
  | 'energy'
  | 'press'
  | 'color'
  | 'none';

export interface ChannelClassDef {
  fits: RoleId[];
  types: string[];
  // отмечать канал при добавлении устройства
  preset: boolean;
}

export interface ControlMeta {
  type?: string;
  units?: string;
  readonly?: boolean;
  isEnum?: boolean;
  min?: number;
  max?: number;
}

export interface Classification {
  cls: ChannelClass;
  why?: string;
  units?: string;
}

export interface LiveControls {
  meta: (_deviceId: string, _controlId: string) => ControlMeta | null;
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

export interface ConfigService {
  sid: number;
  role: string;
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

// Канал устройства WB, ставший устройством конфига; extra — роли из других каналов того же устройства.
export interface WbChannel {
  did: number;
  name: string;
  type: string;
  group: string;
  prim: RoleId;
  extra: Partial<Record<RoleId, string>>;
}

export interface WbDevice {
  id: string;
  matter: boolean;
  alice: boolean;
  channels: Record<string, WbChannel>;
}

// Строка созданного устройства; bind — роль → "device/control".
export interface OwnRow {
  did: number;
  type: string;
  name: string;
  group: string;
  bind: Partial<Record<RoleId, string>>;
}

export interface OwnDevice {
  id: string;
  name: string;
  matter: boolean;
  alice: boolean;
  rows: OwnRow[];
}

export interface OrigBinding {
  binding: ConfigBinding;
  range?: Range;
}

export interface EditorModel {
  wbs: WbDevice[];
  own: OwnDevice[];
}

export interface ParsedConfig extends EditorModel {
  raw: unknown[];
  orig: Record<number, Partial<Record<RoleId, OrigBinding>>>;
  mixed: Record<string, boolean>;
}

export interface Draft {
  name: string;
  role: RoleId;
}

export interface BuiltConfig {
  config: Config;
  drafts: Draft[];
}

export type Selection = { kind: 'wb' | 'own'; id: string } | null;

export type BackendState = 'checking' | 'available' | 'unavailable';

export interface BackendStatus {
  has_config?: boolean;
  parses?: boolean;
  path?: string;
  modified_at?: number;
  device_count?: number;
}
