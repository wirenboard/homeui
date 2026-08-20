import type { DeviceCells } from './types';

// Builds a `WbControls` declaration from the controller's live device list.
//
// It declaration-merges into the empty `WbControls` interface shipped in
// wb-rules.d.ts, turning on type safety for the stringly-referenced APIs
// (`getControl("device/control")` and `dev["device/control"]`) against the
// controls that actually exist on this controller - with their real types,
// so e.g. writing a string to a numeric control is flagged. References not
// in the list stay loose, exactly as when the registry is empty.
//
// Returns an empty string when there is nothing to declare, so callers can
// skip adding the extra file entirely.
export function buildControlsRegistry(devicesStore: DeviceCells): string {
  if (!devicesStore.cells) return '';
  const entries: string[] = [];
  for (const cell of devicesStore.cells.values()) {
    // skip the engine's own system controls and cells whose type is not
    // known yet (meta not received) - an unknown type would just map to
    // `any` in the .d.ts anyway
    if (cell.isSystem || !cell.type || cell.type === 'incomplete') continue;
    // JSON.stringify quotes and escapes both the "device/control" key and
    // the type value safely for a .d.ts string literal
    entries.push(`  ${JSON.stringify(cell.id)}: ${JSON.stringify(cell.type)};`);
  }
  return entries.length ? `interface WbControls {\n${entries.join('\n')}\n}\n` : '';
}
