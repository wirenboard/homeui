import type { DeviceType } from './types';

// Каталог типов устройств (плоская модель). Тип = набор слотов-ролей; kind/access живут в
// словаре роли (roles.ts). Зеркало contract/get_catalog.json (types).
export const DEVICE_TYPES: DeviceType[] = [
  {
    id: 'switch',
    name: { ru: 'Реле', en: 'Switch' },
    slots: [{ role: 'on_off', required: true }],
  },
  {
    id: 'outlet',
    name: { ru: 'Розетка', en: 'Outlet' },
    slots: [{ role: 'on_off', required: true }],
  },
  {
    id: 'light',
    name: { ru: 'Лампа', en: 'Light' },
    slots: [
      { role: 'on_off', required: true },
      { role: 'brightness', required: false },
      { role: 'color_temperature', required: false, requires: ['brightness'] },
      { role: 'color', required: false, requires: ['brightness'] },
    ],
  },
  {
    id: 'temperature_sensor',
    name: { ru: 'Датчик температуры', en: 'Temperature sensor' },
    slots: [{ role: 'temperature', required: true }],
  },
  {
    id: 'humidity_sensor',
    name: { ru: 'Датчик влажности', en: 'Humidity sensor' },
    slots: [{ role: 'humidity', required: true }],
  },
  {
    id: 'illuminance_sensor',
    name: { ru: 'Датчик освещённости', en: 'Illuminance sensor' },
    slots: [{ role: 'illuminance', required: true }],
  },
  {
    id: 'co2_sensor',
    name: { ru: 'Датчик CO2', en: 'CO2 sensor' },
    slots: [{ role: 'co2', required: true }],
  },
  {
    id: 'contact_sensor',
    name: { ru: 'Датчик открытия (геркон)', en: 'Contact sensor' },
    slots: [{ role: 'contact', required: true }],
  },
  {
    id: 'motion_sensor',
    name: { ru: 'Датчик движения', en: 'Motion sensor' },
    slots: [{ role: 'motion', required: true }],
  },
  {
    id: 'occupancy_sensor',
    name: { ru: 'Датчик присутствия', en: 'Occupancy sensor' },
    slots: [{ role: 'occupancy', required: true }],
  },
  {
    id: 'leak_sensor',
    name: { ru: 'Датчик протечки', en: 'Leak sensor' },
    slots: [{ role: 'leak', required: true }],
  },
  {
    id: 'smoke_sensor',
    name: { ru: 'Датчик дыма', en: 'Smoke sensor' },
    slots: [{ role: 'smoke', required: true }],
  },
  {
    id: 'power_sensor',
    name: { ru: 'Датчик мощности', en: 'Power sensor' },
    slots: [{ role: 'power', required: true }],
  },
  {
    id: 'energy_meter',
    name: { ru: 'Счётчик энергии', en: 'Energy meter' },
    slots: [{ role: 'energy', required: true }],
  },
  {
    id: 'button',
    name: { ru: 'Кнопка', en: 'Button' },
    slots: [{ role: 'press', required: true }],
  },
  {
    id: 'cover',
    name: { ru: 'Привод / шторы', en: 'Cover' },
    slots: [
      { role: 'position', required: true },
      { role: 'on_off', required: false },
    ],
  },
];
