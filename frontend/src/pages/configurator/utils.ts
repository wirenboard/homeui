import { type Cell } from '@/stores/devices';
import { inferRole } from './infer';
import { roleDef } from './roles';

// Контрол подходит роли, если совпал вид и доступ (запись → нужен rw-контрол).
export const matchesRole = (cell: Cell, role: string): boolean => {
  const def = roleDef(role);
  return inferRole(cell).kind === def.kind && (def.access === 'read' || !cell.readOnly);
};

export const cellLabel = (cell: Cell): string => `${cell.name} — ${cell.deviceId}`;

// Роль по контролу неоднозначна, если /meta многозначно: range (какой уровень?), alarm,
// или value без единиц (общий числовой) — оператору стоит уточнить роль.
const AMBIGUOUS_TYPES = new Set(['range', 'alarm']);
export const isAmbiguous = (cell: Cell): boolean =>
  AMBIGUOUS_TYPES.has(cell.type as string) || (cell.type === 'value' && !cell.units);
