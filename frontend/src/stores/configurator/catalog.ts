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
  setting: { rw: true, unit: true },
  number: { unit: true },
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
  { id: 'number_setting', category: 'control', roles: [['setting', true]] },
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
  { id: 'number_sensor', category: 'sensors', roles: [['number', true], ['battery', false]] },
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
  setting: { fits: ['setting'], types: ['number_setting'], preset: false },
  number: { fits: ['number'], types: ['number_sensor'], preset: false },
  color: { fits: ['color'], types: [], preset: false },
  none: { fits: [], types: [], preset: false },
};

// Тип по классу нельзя угадать — пользователь выбирает его сам.
export const isAmbiguousClass = (cls: ChannelClass) =>
  !CHANNEL_CLASSES[cls].preset && CHANNEL_CLASSES[cls].types.length > 1;

// Служебные каналы модулей не отмечаем при добавлении устройства.
export const NO_PRESET = /^(mcu|supply|board|cpu|buzzer|red led|green led|led|learn)/i;

// Единицы из скобок в конце имени канала: «LED Period (s)» → «s».
const unitsFromName = (id?: string) => /\(([^()]+)\)\s*$/.exec(id ?? '')?.[1] ?? '';

// Шкалы яркости и положения без единиц (WB и zigbee-лампы).
const LEVEL_SCALES = new Set([100, 254, 255]);

// Значения action у кнопок zigbee2mqtt (Sonoff, Aqara, Tuya).
const PRESS_VALUES = new Set(['single', 'double', 'triple', 'long', 'hold']);

// Служебные числа: качество связи zigbee, адрес Modbus, серийный номер.
const SERVICE_IDS = /^(linkquality|modbus[ _]slave[ _]id|serial([ _]number)?)$/i;

const UNITS_CLASS: Record<string, ChannelClass> = {
  'deg C': 'temp', '%, RH': 'hum', ppm: 'co2', lx: 'lux', W: 'power', kWh: 'energy',
};

const TYPE_CLASS: Record<string, ChannelClass> = {
  temperature: 'temp', rel_humidity: 'hum', concentration: 'co2', lux: 'lux',
  power: 'power', power_consumption: 'energy',
};

// Класс канала по его /meta: какие роли он закрывает, или почему не подходит ни одной.
export const classify = (meta: ControlMeta): Classification => {
  const type = meta.type || '';
  const units = meta.units || '';
  const numeric = (): Classification => ({
    cls: meta.readonly ? 'number' : 'setting',
    units: units || unitsFromName(meta.id),
  });
  // available у wb-mqtt-zigbee — связь с устройством, а не датчик.
  if (meta.readonly && meta.id === 'available') {
    return { cls: 'none', why: 'availability' };
  }
  if (SERVICE_IDS.test(meta.id ?? '')) {
    return { cls: 'none', why: 'service' };
  }
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
      if (units === '%' || units === 'K' || (!units && LEVEL_SCALES.has(meta.max ?? 100))) {
        return { cls: 'level' };
      }
      return numeric();
    case 'rgb':
      return { cls: 'color', why: 'color_only' };
    case 'text':
      return { cls: 'none', why: 'text' };
    case 'value':
      return UNITS_CLASS[units] ? { cls: UNITS_CLASS[units] } : numeric();
    default:
      if (TYPE_CLASS[type]) {
        return { cls: TYPE_CLASS[type] };
      }
      return meta.valueType === 'number' ? numeric() : { cls: 'none', why: 'none' };
  }
};

export const findType = (id: string): DeviceTypeDef | undefined => DEVICE_TYPES.find((type) => type.id === id);

// У типа есть единицы, если они есть у его основной роли.
export const hasUnit = (typeId: string) => !!ROLES[findType(typeId)?.roles[0][0]]?.unit;

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
