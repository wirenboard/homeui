import type { Option } from '@/components/dropdown';

export const DefaultRoom = 'without_rooms';

export const deviceTypes = {
  sensor: [
    'devices.types.sensor',
    'devices.types.sensor.button',
    'devices.types.sensor.climate',
    'devices.types.sensor.gas',
    'devices.types.sensor.illumination',
    'devices.types.sensor.motion',
    'devices.types.sensor.open',
    'devices.types.sensor.smoke',
    'devices.types.sensor.vibration',
    'devices.types.sensor.water_leak',
  ],
  smart_meter: [
    'devices.types.smart_meter',
    'devices.types.smart_meter.cold_water',
    'devices.types.smart_meter.electricity',
    'devices.types.smart_meter.gas',
    'devices.types.smart_meter.heat',
    'devices.types.smart_meter.hot_water',
  ],
  media: [
    'devices.types.camera',
    'devices.types.media_device',
    'devices.types.media_device.receiver',
    'devices.types.media_device.tv',
    'devices.types.media_device.tv_box',
  ],
  cooking: [
    'devices.types.cooking',
    'devices.types.cooking.coffee_maker',
    'devices.types.cooking.kettle',
    'devices.types.cooking.multicooker',
    'devices.types.dishwasher',
  ],
  appliances: [
    'devices.types.iron',
    'devices.types.vacuum_cleaner',
    'devices.types.washing_machine',
  ],
  pet: [
    'devices.types.pet_drinking_fountain',
    'devices.types.pet_feeder',
  ],
  climate: [
    'devices.types.humidifier',
    'devices.types.purifier',
    'devices.types.thermostat',
    'devices.types.thermostat.ac',
    'devices.types.ventilation',
    'devices.types.ventilation.fan',
  ],
  electrics: [
    'devices.types.light',
    'devices.types.light.lamp',
    'devices.types.light.ceiling',
    'devices.types.light.strip',
    'devices.types.socket',
    'devices.types.switch',
    'devices.types.switch.relay',
  ],
  openable: [
    'devices.types.openable',
    'devices.types.openable.curtain',
    'devices.types.openable.valve',
  ],
  other: [
    'devices.types.other',
  ],
};

export enum Capability {
  'On/Off' = 'devices.capabilities.on_off',
  'Color setting' = 'devices.capabilities.color_setting',
  // Mode = 'devices.capabilities.mode',
  Range = 'devices.capabilities.range',
  // Toggle = 'devices.capabilities.toggle',
}

export enum Color {
  ColorModel = 'color_model',
  TemperatureK = 'temperature_k',
  ColorScene = 'scene',
}

export enum ColorModel {
  RGB = 'rgb',
  HSV = 'hsv',
}

export const modes = [
  'wet_cleaning',
  'dry_cleaning',
  'mixed_cleaning',
  'auto',
  'eco',
  'smart',
  'turbo',
  'cool',
  'dry',
  'fan_only',
  'heat',
  'preheat',
  'high',
  'low',
  'medium',
  'max',
  'min',
  'fast',
  'slow',
  'express',
  'normal',
  'quiet',
  'horizontal',
  'stationary',
  'vertical',
  'supply_air',
  'extraction_air',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'americano',
  'cappuccino',
  'double_espresso',
  'espresso',
  'latte',
  'black_tea',
  'flower_tea',
  'green_tea',
  'herbal_tea',
  'oolong_tea',
  'puerh_tea',
  'red_tea',
  'white_tea',
  'glass',
  'intensive',
  'pre_rinse',
  'aspic',
  'baby_food',
  'baking',
  'bread',
  'boiling',
  'cereals',
  'cheesecake',
  'deep_fryer',
  'dessert',
  'fowl',
  'frying',
  'macaroni',
  'milk_porridge',
  'multicooker',
  'pasta',
  'pilaf',
  'pizza',
  'sauce',
  'slow_cook',
  'soup',
  'steam',
  'stewing',
  'vacuum',
  'yogurt',
];

export const ranges = ['brightness', 'channel', 'humidity', 'open', 'temperature', 'volume'];

export const toggles = ['backlight', 'controls_locked', 'ionization', 'keep_warm', 'mute', 'oscillation', 'pause'];

export enum Property {
  Float = 'devices.properties.float',
  // Event = 'devices.properties.event',
}

export const floats = [
  'amperage',
  'battery_level',
  'co2_level',
  'electricity_meter',
  'food_level',
  'gas_meter',
  'heat_meter',
  'humidity',
  'illumination',
  'meter',
  'pm1_density',
  'pm2.5_density',
  'pm10_density',
  'power',
  'pressure',
  'temperature',
  'tvoc',
  'voltage',
  'water_level',
  'water_meter',
];

export const events = [
  'vibration',
  'open',
  'button',
  'motion',
  'smoke',
  'gas',
  'battery_level',
  'food_level',
  'water_level',
  'water_leak',
];

export const floatUnitsByInstance: Record<string, string[]> = {
  amperage: ['unit.ampere'],
  battery_level: ['unit.percent'],
  co2_level: ['unit.ppm'],
  electricity_meter: ['unit.kilowatt_hour'],
  food_level: ['unit.percent'],
  gas_meter: ['unit.cubic_meter'],
  heat_meter: ['unit.gigacalorie'],
  humidity: ['unit.percent'],
  illumination: ['unit.illumination.lux'],
  meter: [], // Universal meter not have units
  pm1_density: ['unit.density.mcg_m3'],
  'pm2.5_density': ['unit.density.mcg_m3'],
  pm10_density: ['unit.density.mcg_m3'],
  power: ['unit.watt'],
  pressure: ['unit.pressure.atm', 'unit.pressure.pascal', 'unit.pressure.bar', 'unit.pressure.mmhg'],
  temperature: ['unit.temperature.celsius', 'unit.temperature.kelvin'],
  tvoc: ['unit.density.mcg_m3'],
  voltage: ['unit.volt'],
  water_level: ['unit.percent'],
  water_meter: ['unit.cubic_meter'],
};

// Predefined color scenes per Yandex Smart Home docs
// TODO: <DISABLED_COLOR>: This scene options needed when do multiselect
export const colorSceneOptions: Option<string>[] = [
  { label: 'Alarm', value: 'alarm' },
  { label: 'Alice', value: 'alice' },
  { label: 'Candle', value: 'candle' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Fantasy', value: 'fantasy' },
  { label: 'Garland', value: 'garland' },
  { label: 'Jungle', value: 'jungle' },
  { label: 'Movie', value: 'movie' },
  { label: 'Neon', value: 'neon' },
  { label: 'Night', value: 'night' },
  { label: 'Ocean', value: 'ocean' },
  { label: 'Party', value: 'party' },
  { label: 'Reading', value: 'reading' },
  { label: 'Rest', value: 'rest' },
  { label: 'Romance', value: 'romance' },
  { label: 'Siren', value: 'siren' },
];

// Range units on this moment hardcoded
// NOTE: any units have only one selection,
//       only temperature have alternative - kelvin, but this is not useful
export const rangeUnitByInstance: Record<string, string> = {
  brightness: 'unit.percent',
  humidity: 'unit.percent',
  open: 'unit.percent',
  volume: 'unit.percent',
  temperature: 'unit.temperature.celsius',
  channel: 'unit.channel',
};

export const unitLabels: Record<string, string> = {
  'unit.ampere': 'A',
  'unit.percent': '%',
  'unit.ppm': 'ppm',
  'unit.kilowatt_hour': 'kWh',
  'unit.cubic_meter': 'm³',
  'unit.gigacalorie': 'Gcal',
  'unit.illumination.lux': 'lx',
  'unit.density.mcg_m3': 'µg/m³',
  'unit.watt': 'W',
  'unit.pressure.atm': 'Atm',
  'unit.pressure.pascal': 'Pa',
  'unit.pressure.bar': 'bar',
  'unit.pressure.mmhg': 'mmHg',
  'unit.temperature.celsius': '°C',
  'unit.temperature.kelvin': 'K',
  'unit.volt': 'V',
};

export const defaultColorModelParameters = {
  [ColorModel.RGB]: {
    color_model: ColorModel.RGB,
    instance: ColorModel.RGB,
  },
  [ColorModel.HSV]: {
    color_model: ColorModel.HSV,
    instance: ColorModel.HSV,
  },
};

export const defaultTemperatureParameters = {
  temperature_k: { min: 2700, max: 6500 },
  instance: 'temperature_k',
};

export const defaultColorSceneParameters = {
  color_scene: { scenes: [] },
  instance: 'scene',
};
