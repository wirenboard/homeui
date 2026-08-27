import type { DeviceCells } from './types';

// Builds a `WbControls` declaration from the live device list. It declaration-merges
// into the empty interface in wb-rules.d.ts, typing getControl("device/control") and
// dev["device/control"] against the controls that exist; unknown refs stay loose.
export function buildControlsRegistry(devicesStore: DeviceCells): string {
  if (!devicesStore.cells) return '';
  const entries: string[] = [];
  for (const cell of devicesStore.cells.values()) {
    // system controls and cells whose meta has not arrived would only map to any
    if (cell.isSystem || !cell.type || cell.type === 'incomplete') continue;
    entries.push(`  ${JSON.stringify(cell.id)}: ${JSON.stringify(cell.type)};`);
  }
  return entries.length ? `interface WbControls {\n${entries.join('\n')}\n}\n` : '';
}
