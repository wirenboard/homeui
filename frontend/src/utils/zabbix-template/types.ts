/**
 * Types for the pure Zabbix export builder.
 *
 * This module is intentionally free of any homeui imports so it can be unit
 * tested in isolation and reused by the page store. The caller is responsible
 * for resolving live devices/controls into the plain structures below.
 */

export interface ZabbixControlInput {
  /** Control id within the device, e.g. `MCU Temperature`. */
  controlId: string;
  /** Display name; follows the interface language. */
  name: string;
  /** WB control type, e.g. `switch` / `value` / `range` / `text` / `rgb` / `alarm` / `pushbutton`. */
  type: string;
  /** Optional units from control meta, e.g. `deg C`. */
  units?: string;
}

export interface ZabbixDeviceInput {
  /** Device slug (MQTT topic segment), baked into item keys, e.g. `wb-m1w2_30`. */
  slug: string;
  /** Device display name, prefixed to item names as "<name>: <control>" (falls back to slug). */
  name?: string;
  controls: ZabbixControlInput[];
}

export interface ZabbixExportInput {
  /** Date string used in the template name, e.g. `2026-06-04 16-40`. */
  templateDate: string;
  devices: ZabbixDeviceInput[];
}
