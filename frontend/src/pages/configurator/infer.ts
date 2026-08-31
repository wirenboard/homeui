import type { Cell } from '@/stores/devices';
import type { InferredRole } from './types';

// units → (role, kind). Единицы — из набора WB units (см. конвенцию mapping.md).
// Это прототип авто-инференса: показывает, как контрол ложится в нашу модель.
const unitRoles: Record<string, InferredRole> = {
  'deg C': { role: 'temperature', kind: 'measurement' },
  '%, RH': { role: 'humidity', kind: 'measurement' },
  W: { role: 'power', kind: 'measurement' },
  kWh: { role: 'energy', kind: 'accumulation' },
  V: { role: 'voltage', kind: 'measurement' },
  mV: { role: 'voltage', kind: 'measurement' },
  A: { role: 'current', kind: 'measurement' },
  mA: { role: 'current', kind: 'measurement' },
  lx: { role: 'illuminance', kind: 'measurement' },
  Pa: { role: 'pressure', kind: 'measurement' },
  mbar: { role: 'pressure', kind: 'measurement' },
  bar: { role: 'pressure', kind: 'measurement' },
  ppm: { role: 'co2', kind: 'measurement' },
  'm^3': { role: 'water', kind: 'accumulation' },
  'm^3/h': { role: 'water_flow', kind: 'measurement' },
};

// Специфические (устаревшие) WB-типы контролов → (role, kind).
// WB рекомендует value + units, но эти типы ещё встречаются на устройствах.
const typeRoles: Record<string, InferredRole> = {
  temperature: { role: 'temperature', kind: 'measurement' },
  rel_humidity: { role: 'humidity', kind: 'measurement' },
  atmospheric_pressure: { role: 'pressure', kind: 'measurement' },
  sound_level: { role: 'sound_level', kind: 'measurement' },
  rainfall: { role: 'rainfall', kind: 'measurement' },
  wind_speed: { role: 'wind_speed', kind: 'measurement' },
  power: { role: 'power', kind: 'measurement' },
  power_consumption: { role: 'energy', kind: 'accumulation' },
  voltage: { role: 'voltage', kind: 'measurement' },
  current: { role: 'current', kind: 'measurement' },
  resistance: { role: 'resistance', kind: 'measurement' },
  concentration: { role: 'co2', kind: 'measurement' },
  heat_power: { role: 'heat_power', kind: 'measurement' },
  heat_energy: { role: 'heat_energy', kind: 'accumulation' },
  water_flow: { role: 'water_flow', kind: 'measurement' },
  water_consumption: { role: 'water', kind: 'accumulation' },
};

// Инференс канонической роли по WB-контролу (type + units + readonly + enum).
export function inferRole(cell: Cell): InferredRole {
  if (cell.isEnum) {
    return { role: 'mode', kind: 'enumeration' };
  }

  switch (cell.type as string) {
    case 'switch':
      return { role: cell.readOnly ? 'binary' : 'on_off', kind: 'binary_state' };
    case 'alarm':
      return { role: 'alarm', kind: 'binary_state' };
    case 'pushbutton':
      return cell.readOnly
        ? { role: 'press', kind: 'event' }
        : { role: 'command', kind: 'command' };
    case 'range':
      return { role: 'level', kind: 'level' };
    case 'rgb':
      return { role: 'color', kind: 'color' };
    case 'text':
      return { role: 'text', kind: 'text' };
    case 'value':
      return unitRoles[cell.units] ?? { role: 'value', kind: 'measurement' };
    default:
      // специфический WB-тип → по имени; иначе по units; иначе числовой сенсор по умолчанию
      return typeRoles[cell.type as string]
        ?? unitRoles[cell.units]
        ?? { role: cell.type as string, kind: 'measurement' };
  }
}
