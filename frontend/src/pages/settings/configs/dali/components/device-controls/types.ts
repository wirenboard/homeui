import type Cell from '@/stores/devices/cell';

/** One slot of the featured strip: a control, optionally with its live readback. */
export interface StripEntry {
  cell: Cell;
  readback?: Cell;
}

export interface DeviceControlsProps {
  mqttId: string;
}
