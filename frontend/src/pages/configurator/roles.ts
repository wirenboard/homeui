import type { RoleDef, RoleKind } from './types';

// Словарь ролей — зеркало contract/get_catalog.json (roles). Вид, тип значения, доступ и
// нейтральная шкала выводятся отсюда по роли; в конфиге они не хранятся (lean-сервис).
export const ROLE_CATALOG: Record<string, RoleDef> = {
  on_off:            { kind: 'binary_state', value_type: 'bool', access: 'readwrite' },
  brightness:        {
    kind: 'level', value_type: 'number', access: 'readwrite', unit: '%',
    range: { min: 0, max: 100, step: 1 }, fixedScale: true,
  },
  position:          {
    kind: 'level', value_type: 'number', access: 'readwrite', unit: '%',
    range: { min: 0, max: 100, step: 1 }, fixedScale: true,
  },
  color:             { kind: 'color', value_type: 'color', access: 'readwrite' },
  color_temperature: {
    kind: 'level', value_type: 'number', access: 'readwrite', unit: 'K',
    range: { min: 2700, max: 6500, step: 100 },
  },
  temperature:       { kind: 'measurement', value_type: 'number', access: 'read', unit: 'deg C' },
  humidity:          { kind: 'measurement', value_type: 'number', access: 'read', unit: '%' },
  co2:               { kind: 'measurement', value_type: 'number', access: 'read', unit: 'ppm' },
  illuminance:       { kind: 'measurement', value_type: 'number', access: 'read', unit: 'lx' },
  power:             { kind: 'measurement', value_type: 'number', access: 'read', unit: 'W' },
  energy:            { kind: 'accumulation', value_type: 'number', access: 'read', unit: 'kWh' },
  contact:           { kind: 'binary_state', value_type: 'bool', access: 'read' },
  motion:            { kind: 'binary_state', value_type: 'bool', access: 'read' },
  occupancy:         { kind: 'binary_state', value_type: 'bool', access: 'read' },
  leak:              { kind: 'binary_state', value_type: 'bool', access: 'read' },
  smoke:             { kind: 'binary_state', value_type: 'bool', access: 'read' },
  press:             { kind: 'event', value_type: 'string', access: 'read' },
};

const FALLBACK: RoleDef = { kind: 'measurement', value_type: 'number', access: 'read' };

// Словарь роли; для роли вне каталога — измерение только на чтение (безопасный дефолт инференса).
export function roleDef(role: string): RoleDef {
  return ROLE_CATALOG[role] ?? FALLBACK;
}

export function roleKindOf(role: string): RoleKind {
  return roleDef(role).kind;
}
