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
  | 'press'
  | 'battery'
  | 'setting'
  | 'number';

export interface RoleDef {
  rw?: boolean;
  bool?: boolean;
  scale?: boolean;
  // оператор задаёт единицы, они пишутся в сервис
  unit?: boolean;
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
  | 'battery'
  | 'setting'
  | 'number'
  | 'color'
  | 'none';

export interface ChannelClassDef {
  fits: RoleId[];
  types: string[];
  // отмечать канал при добавлении устройства
  preset: boolean;
}

export interface ControlMeta {
  id?: string;
  type?: string;
  units?: string;
  readonly?: boolean;
  valueType?: string;
  isEnum?: boolean;
  enumKeys?: string[];
  min?: number;
  max?: number;
  step?: number;
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
  unit?: string;
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

// Строка устройства: канал WB или строка созданного; bind — роль → "device/control".
export interface DeviceRow {
  did: number;
  name: string;
  // '' — тип ещё не выбран, строка не экспортируется
  type: string;
  group: string;
  // единицы числового датчика или настройки
  unit?: string;
  bind: Partial<Record<RoleId, string>>;
}

// Строка при добавлении устройства: did и группу назначает стор.
export type NewDeviceRow = Omit<DeviceRow, 'did' | 'group'>;

// channels: ключ — контрол, ради которого строка заведена.
export interface WbDevice {
  id: string;
  matter: boolean;
  alice: boolean;
  channels: Record<string, DeviceRow>;
}

export interface OwnDevice {
  id: string;
  name: string;
  matter: boolean;
  alice: boolean;
  rows: DeviceRow[];
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

// role пуст, если у канала не выбран тип.
export interface Draft {
  name: string;
  role: RoleId | null;
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
