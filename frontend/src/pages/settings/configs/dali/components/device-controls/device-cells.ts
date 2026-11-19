import { devicesStore } from '@/stores/devices';
import type Cell from '@/stores/devices/cell';
import { ControlId } from './types';

// A `current_*` readback repeats its setpoint, the error status is shown by GearErrorStatus
// and the level reading is printed inside the slider.
const isHidden = (cell: Cell) => cell.controlId.startsWith('current_') || cell.controlId === ControlId.ErrorStatus;

export function deviceCells(mqttId: string) {
  let levelReading: Cell | undefined;
  // Broadcast has the level but no reading.
  let isGear = false;
  const cells: Cell[] = [];
  devicesStore.getDeviceCells(mqttId).forEach((cell) => {
    if (cell.controlId === ControlId.ActualLevel) {
      levelReading = cell;
    } else if (!isHidden(cell)) {
      isGear ||= cell.controlId === ControlId.WantedLevel;
      cells.push(cell);
    }
  });
  cells.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return { cells, levelReading, isGear };
}
