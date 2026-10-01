import type Cell from '@/stores/devices/cell';
import { ControlId } from './types';

const PINNED_CONTROLS_LIMIT = 6;

const PINNED_CONTROLS_ORDER = [
  ControlId.OnOff,
  ControlId.WantedLevel,
  'set_',
  ControlId.LastActed,
  ControlId.Off,
  ControlId.RecallMaxLevel,
  ControlId.GoToScene,
];
// The On/Off switch already does what these two buttons do.
const REPLACED_BY_ON_OFF = new Set<string>([ControlId.Off, ControlId.RecallMaxLevel]);

const pinnedControlsRank = ({ controlId }: Cell) =>
  PINNED_CONTROLS_ORDER.indexOf(controlId.startsWith('set_') ? 'set_' : controlId);

export function pickGear(cells: Cell[]): Cell[] {
  const hasOnOff = cells.some((cell) => cell.controlId === ControlId.OnOff);
  return cells
    .filter((cell) => pinnedControlsRank(cell) >= 0 && !(hasOnOff && REPLACED_BY_ON_OFF.has(cell.controlId)))
    .sort((a, b) => pinnedControlsRank(a) - pinnedControlsRank(b))
    .slice(0, PINNED_CONTROLS_LIMIT);
}

export const isCommand = (cell: Cell) => cell.type === 'pushbutton';

// Commands go after the fields, the sort is stable and keeps the daemon order within each.
export const gearRest = (cells: Cell[], pinnedControls: Cell[]) => {
  const pinnedControlsIds = new Set(pinnedControls.map((cell) => cell.id));
  return cells
    .filter((cell) => !pinnedControlsIds.has(cell.id))
    .sort((a, b) => Number(isCommand(a)) - Number(isCommand(b)));
};
