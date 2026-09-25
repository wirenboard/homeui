import type Cell from '@/stores/devices/cell';

const INSTANCE_ID = /(\d+)$/;

// Device-wide controls have no instance number and go last.
const instanceIndex = (cell: Cell) => {
  const parsed = INSTANCE_ID.exec(cell.controlId);
  return parsed ? Number(parsed[1]) : Number.MAX_SAFE_INTEGER;
};

export function instanceGroups(cells: Cell[]): Cell[][] {
  const byInstance = new Map<number, Cell[]>();
  cells.forEach((cell) => {
    const index = instanceIndex(cell);
    const group = byInstance.get(index);
    if (group) {
      group.push(cell);
    } else {
      byInstance.set(index, [cell]);
    }
  });
  return [...byInstance.keys()]
    .sort((a, b) => a - b)
    .map((index) => byInstance.get(index));
}
