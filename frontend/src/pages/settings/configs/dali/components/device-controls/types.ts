import type Cell from '@/stores/devices/cell';

/** `t` from react-i18next, narrowed to what the strip asks of it. */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

/** One slot of the featured strip: a control, optionally with its live readback. */
export interface StripEntry {
  cell: Cell;
  readback?: Cell;
}

export interface DeviceControlsProps {
  mqttId: string;
}

/** The live reading rendered beside its setpoint control. */
export interface ReadbackSuffixProps {
  cell: Cell;
}
