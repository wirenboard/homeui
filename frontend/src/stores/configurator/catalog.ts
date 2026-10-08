import type {
  ChannelClass,
  ChannelClassDef,
  Classification,
  ControlMeta,
  DeviceTypeDef,
  RoleDef,
  RoleId,
  TypeCategory,
} from './types';

export const ROLES: Record<RoleId, RoleDef> = {
  on_off: { rw: true, bool: true },
  brightness: { rw: true, scale: true },
  color_temperature: { rw: true },
  color: { rw: true },
  position: { rw: true, scale: true },
  temperature: {},
  humidity: {},
  co2: {},
  illuminance: {},
  leak: { bool: true },
  contact: { bool: true },
  motion: { bool: true },
  occupancy: { bool: true },
  smoke: { bool: true },
  power: {},
  energy: {},
  press: {},
  battery: {},
};

export const TYPE_CATEGORIES: TypeCategory[] = ['control', 'sensors', 'energy'];

export const DEVICE_TYPES: DeviceTypeDef[] = [
  { id: 'switch', category: 'control', roles: [['on_off', true]] },
  { id: 'outlet', category: 'control', roles: [['on_off', true]] },
  {
    id: 'light',
    category: 'control',
    roles: [['on_off', true], ['brightness', false], ['color_temperature', false], ['color', false]],
  },
  { id: 'cover', category: 'control', roles: [['position', true], ['on_off', false]] },
  { id: 'button', category: 'control', roles: [['press', true], ['battery', false]] },
  { id: 'temperature_sensor', category: 'sensors', roles: [['temperature', true], ['battery', false]] },
  { id: 'humidity_sensor', category: 'sensors', roles: [['humidity', true], ['battery', false]] },
  { id: 'co2_sensor', category: 'sensors', roles: [['co2', true], ['battery', false]] },
  { id: 'illuminance_sensor', category: 'sensors', roles: [['illuminance', true], ['battery', false]] },
  { id: 'leak_sensor', category: 'sensors', roles: [['leak', true], ['battery', false]] },
  { id: 'contact_sensor', category: 'sensors', roles: [['contact', true], ['battery', false]] },
  { id: 'motion_sensor', category: 'sensors', roles: [['motion', true], ['battery', false]] },
  { id: 'occupancy_sensor', category: 'sensors', roles: [['occupancy', true], ['battery', false]] },
  { id: 'smoke_sensor', category: 'sensors', roles: [['smoke', true], ['battery', false]] },
  { id: 'power_sensor', category: 'energy', roles: [['power', true]] },
  { id: 'energy_meter', category: 'energy', roles: [['energy', true]] },
];

export const CHANNEL_CLASSES: Record<ChannelClass, ChannelClassDef> = {
  bin_rw: { fits: ['on_off'], types: ['switch', 'outlet', 'light'], preset: true },
  bin_r: {
    fits: ['leak', 'contact', 'motion', 'occupancy', 'smoke'],
    types: ['leak_sensor', 'contact_sensor', 'motion_sensor', 'occupancy_sensor', 'smoke_sensor'],
    preset: false,
  },
  level: { fits: ['brightness', 'position', 'color_temperature'], types: ['light', 'cover'], preset: false },
  temp: { fits: ['temperature'], types: ['temperature_sensor'], preset: true },
  hum: { fits: ['humidity'], types: ['humidity_sensor'], preset: true },
  co2: { fits: ['co2'], types: ['co2_sensor'], preset: true },
  lux: { fits: ['illuminance'], types: ['illuminance_sensor'], preset: true },
  power: { fits: ['power'], types: ['power_sensor'], preset: false },
  energy: { fits: ['energy'], types: ['energy_meter'], preset: false },
  press: { fits: ['press'], types: ['button'], preset: true },
  battery: { fits: ['battery'], types: [], preset: false },
  color: { fits: ['color'], types: [], preset: false },
  none: { fits: [], types: [], preset: false },
};

// Тип по классу нельзя угадать — пользователь выбирает его сам.
export const isAmbiguousClass = (cls: ChannelClass) =>
  !CHANNEL_CLASSES[cls].preset && CHANNEL_CLASSES[cls].types.length > 1;

// Служебные каналы модулей не отмечаем при добавлении устройства.
export const NO_PRESET = /^(mcu|supply|board|cpu|buzzer|red led|green led|led|learn)/i;

const UNITS_WHY: Record<string, string> = {
  V: 'voltage', mV: 'voltage', A: 'current', mA: 'current',
  Pa: 'pressure', hPa: 'pressure', mbar: 'pressure', bar: 'pressure', 'mm Hg': 'pressure',
  dB: 'noise', dBA: 'noise', 'm^3': 'water', 'm^3/h': 'water', l: 'water', ppb: 'air', 'ug/m^3': 'air',
  Ohm: 'resistance', Hz: 'frequency', s: 'time', ms: 'time',
};

const LEGACY_WHY: Record<string, string> = {
  voltage: 'voltage', current: 'current', atmospheric_pressure: 'pressure', sound_level: 'noise',
  water_flow: 'water', water_consumption: 'water', heat_power: 'heat', heat_energy: 'heat',
  resistance: 'resistance', wind_speed: 'weather', rainfall: 'weather',
};

// Шкалы яркости и положения без единиц (WB и zigbee-лампы).
const LEVEL_SCALES = new Set([100, 254, 255]);

// Значения action у кнопок zigbee2mqtt (Sonoff, Aqara, Tuya).
const PRESS_VALUES = new Set(['single', 'double', 'triple', 'long', 'hold']);

const UNITS_CLASS: Record<string, ChannelClass> = {
  'deg C': 'temp', '%, RH': 'hum', ppm: 'co2', lx: 'lux', W: 'power', kWh: 'energy',
};

const TYPE_CLASS: Record<string, ChannelClass> = {
  temperature: 'temp', rel_humidity: 'hum', concentration: 'co2', lux: 'lux',
  power: 'power', power_consumption: 'energy',
};

const byUnits = (units: string): Classification => {
  if (UNITS_CLASS[units]) {
    return { cls: UNITS_CLASS[units] };
  }
  if (UNITS_WHY[units]) {
    return { cls: 'none', why: UNITS_WHY[units] };
  }
  return { cls: 'none', why: units ? 'none' : 'no_units' };
};

// Класс канала по его /meta: какие роли он закрывает, или почему не подходит ни одной.
export const classify = (meta: ControlMeta): Classification => {
  const type = meta.type || '';
  const units = meta.units || '';
  if (meta.readonly && units === '%' && /batter/i.test(meta.id ?? '')) {
    return { cls: 'battery', why: 'battery' };
  }
  if (meta.isEnum) {
    const isPress = meta.readonly && meta.enumKeys?.some((key) => PRESS_VALUES.has(key));
    return isPress ? { cls: 'press' } : { cls: 'none', why: 'enum' };
  }
  switch (type) {
    case 'switch':
      return { cls: meta.readonly ? 'bin_r' : 'bin_rw' };
    case 'alarm':
      return { cls: 'bin_r' };
    case 'pushbutton':
      return meta.readonly ? { cls: 'press' } : { cls: 'none', why: 'cmd' };
    case 'range':
      if (units === '%' || units === 'K') {
        return { cls: 'level' };
      }
      if (!units) {
        return LEVEL_SCALES.has(meta.max ?? 100) ? { cls: 'level' } : { cls: 'none', why: 'range_setting' };
      }
      return { cls: 'none', why: 'range_units', units };
    case 'rgb':
      return { cls: 'color', why: 'color_only' };
    case 'text':
      return { cls: 'none', why: 'text' };
    case 'value':
      return byUnits(units);
    default:
      if (TYPE_CLASS[type]) {
        return { cls: TYPE_CLASS[type] };
      }
      if (LEGACY_WHY[type]) {
        return { cls: 'none', why: LEGACY_WHY[type] };
      }
      return byUnits(units);
  }
};

export const findType = (id: string): DeviceTypeDef | undefined => DEVICE_TYPES.find((type) => type.id === id);

// Роль, которую закрывает основной канал устройства выбранного типа.
export const primaryRole = (typeId: string, cls?: ChannelClass): RoleId => {
  const type = findType(typeId);
  const fits = cls ? CHANNEL_CLASSES[cls].fits : [];
  return (type.roles.find(([role]) => fits.includes(role)) ?? type.roles[0])[0];
};

// Обязательные роли типа; цвет и цветовая температура лампы требуют яркость.
export const requiredRoles = (typeId: string, bound: Partial<Record<RoleId, unknown>>): RoleId[] => {
  const need = findType(typeId).roles.filter(([, required]) => required).map(([role]) => role);
  if ((bound.color_temperature || bound.color) && !need.includes('brightness')) {
    need.push('brightness');
  }
  return need;
};
