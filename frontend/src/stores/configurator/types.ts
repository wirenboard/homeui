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
  name?: string;
  type: string;
  module: string;
  group?: string;
  adapter_settings?: Record<string, boolean>;
  services: ConfigService[];
}

export interface Config {
  version: string;
  devices: ConfigDevice[];
}

// Строка устройства приложений: один канал; bind — роль → "device/control".
export interface DeviceRow {
  did: number;
  name: string;
  type: string;
  // единицы числового датчика или настройки
  unit?: string;
  bind: Partial<Record<RoleId, string>>;
}

// Строка при добавлении: did назначает стор.
export type NewDeviceRow = Omit<DeviceRow, 'did'>;

// Устройство приложений: name пишется в module конфига, group — в group каждого канала.
export interface Device {
  id: string;
  name: string;
  group: string;
  // adapter_settings из файла со всеми ключами, и адаптеров, которых нет в реестре; нет ключа — default адаптера
  adapterSettings: Record<string, boolean>;
  rows: DeviceRow[];
}

// Канал рецепта: роль → имя контрола устройства; {n} — номер канала, {pair} — номер пары каналов.
export interface WbRecipeChannel {
  type: string;
  bind: Partial<Record<RoleId, string>>;
  // условие шаблона wb-mqtt-serial над параметрами устройства; без него канал берётся всегда
  condition?: string;
  // контрол, при наличии которого канал не нужен
  unless?: string;
  // тип, который предлагается по умолчанию, когда у канала есть выбор
  suggest?: string;
}

// Устройство из конфига wb-mqtt-serial: тип шаблона и параметры, от которых зависит режим.
export interface SerialDevice {
  deviceType: string;
  params: Record<string, unknown>;
}

export interface WbRecipe {
  // идентификатор устройства без адреса → тип шаблона, например wb-msw-v4 → WB-MSW v.4
  models: Record<string, string>;
  // число одинаковых каналов; без него набор берётся один раз
  repeat?: number;
  // число каналов у моделей, где оно меньше repeat; нужно только для показа
  counts?: Record<string, number>;
  channels: WbRecipeChannel[];
  // контрол, по которому видно, что часть устройства в режиме, который рецепт не берёт
  skipped?: string;
  // каналы называются как их контролы, а не по роли
  controlNames?: boolean;
  // каналы идут группами в порядке рецепта, а не по номерам
  byChannel?: boolean;
  // прибор с независимыми выходами: отдельное устройство на каждый канал или на каждый номер
  split?: 'row' | 'index';
}

// Модель с рецептом для показа: типы каналов и сколько раз набор повторяется.
export interface RecipeModel {
  title: string;
  types: string[];
  count: number;
}

export type RecipeFit = (_controlId: string, _role: RoleId) => boolean;

// Строка по рецепту; index — номер канала у повторяющихся, иначе null.
export interface RecipeRow {
  row: NewDeviceRow;
  index: number | null;
  // имя канала берётся от контрола
  byControl?: boolean;
  // тип, который стоит предложить вместо основного
  suggest?: string;
}

export interface OrigBinding {
  binding: ConfigBinding;
  range?: Range;
}

export interface EditorModel {
  devices: Device[];
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

export type Selection = { id: string } | null;

export type BackendState = 'checking' | 'available' | 'unavailable';

// Файл реестра адаптеров из /converter-ext/adapters и работает ли служба адаптера.
export interface Adapter {
  id: string;
  title?: { ru?: string; en?: string };
  package?: string;
  service?: string;
  url?: string;
  // передавать ли устройство без ключа адаптера в adapter_settings
  default?: boolean;
  // только в /status старого конвертера, где реестр лежал вместе с признаком установки
  installed?: boolean;
  active?: boolean;
}

export interface BackendStatus {
  has_config?: boolean;
  parses?: boolean;
  path?: string;
  modified_at?: number;
  device_count?: number;
  adapters?: Adapter[];
}
