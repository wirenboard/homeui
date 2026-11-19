import { type TFunction } from 'i18next';
import type Cell from '@/stores/devices/cell';
import { ControlId } from './types';

// A button carries its name, the On/Off switch positions say it, so the switch's name goes to a tooltip.
export const isSelfLabelled = (cell: Cell) => cell.type === 'pushbutton' || cell.controlId === ControlId.OnOff;

const LABELLED_SETPOINTS = new Set([
  ControlId.WantedLevel,
  'set_rgb',
  'set_white',
  'set_colour_temperature',
  'set_x_coordinate',
  'set_y_coordinate',
]);
const PRIMARY_SETPOINT = /^set_primary_n(\d+)$/;

export function pinnedControlsLabel(cell: Cell, t: TFunction): string {
  const primary = PRIMARY_SETPOINT.exec(cell.controlId);
  if (primary) {
    return t('dali.labels.setpoint-set-primary-n', { n: primary[1] });
  }
  if (LABELLED_SETPOINTS.has(cell.controlId)) {
    return t(`dali.labels.setpoint-${cell.controlId.replaceAll('_', '-')}`);
  }
  return cell.name;
}
