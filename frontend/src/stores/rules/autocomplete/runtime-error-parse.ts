import type { RuleRuntimeError } from '../types';
import type { RuntimeErrorLocation } from './types';

// Parses the engine's console messages into per-file, per-line runtime error
// locations. No CodeMirror imports here: the rules store (app entry chunk) uses this.

// The engine reports absolute physical paths in two shapes:
//   control x/y: write ignored (...) at /etc/wb-rules/foo.js:14
//   ECMAScript error: TypeError: ...\n    at F (/etc/wb-rules/foo.js:29)\n    at ...
// Anchoring on "at" keeps a slash inside the message text ("1/2") from starting a
// bogus path; file names may contain spaces, parentheses and unicode.
const LOCATION_RX = /\bat\s+(?:[^\s(][^(\n]*?\s*\()?(\/[^:\n]*?\.(?:js|ts)):(\d+)(?::\d+)?\)?/g;

// every "path:line" reference in a console message, innermost first
export function parseRuntimeErrorLocations(payload: string): RuntimeErrorLocation[] {
  const out: RuntimeErrorLocation[] = [];
  for (const m of payload.matchAll(LOCATION_RX)) {
    const line = Number(m[2]);
    if (Number.isFinite(line) && line > 0) out.push({ path: m[1], line });
  }
  return out;
}

// the " at /path:line" the engine appends to "write ignored" errors; redundant once anchored
const TRAILING_LOCATION_RX = /\s+at\s+\/[^:\n]*?\.(?:js|ts):\d+(?::\d+)?\s*$/;

export function runtimeErrorSummary(payload: string): string {
  const nl = payload.indexOf('\n');
  return (nl >= 0 ? payload.slice(0, nl) : payload).trim().replace(TRAILING_LOCATION_RX, '');
}

// the engine's -editdir: under it a location must match the virtual path exactly
// (buzz.js must not claim sub/buzz.js); elsewhere a suffix match is best effort
export const RULES_ROOT = '/etc/wb-rules/';

export function locationBelongsToRule(location: RuntimeErrorLocation, virtualPath: string): boolean {
  if (virtualPath === '') return false;
  if (location.path.startsWith(RULES_ROOT)) return location.path === RULES_ROOT + virtualPath;
  return location.path.endsWith('/' + virtualPath);
}

// errors are kept for every rule file (shown when it is opened), bounded
const MAX_RUNTIME_ERRORS = 200;

// The innermost frame in a RULE file is where the user can act (the engine's lib.js
// and module dirs sit on top of the stack for common throws); without one the innermost
// location is kept. One entry per place, repeats counted, latest text wins.
export function recordRuntimeErrorIn(errors: RuleRuntimeError[], payload: string, now: number): void {
  const locations = parseRuntimeErrorLocations(payload);
  if (locations.length === 0) return;
  const { path, line } = locations.find((l) => l.path.startsWith(RULES_ROOT)) ?? locations[0];
  const message = runtimeErrorSummary(payload);
  const existing = errors.find((e) => e.path === path && e.line === line);
  if (existing) {
    existing.count += 1;
    existing.lastSeen = now;
    existing.message = message;
    return;
  }
  if (errors.length >= MAX_RUNTIME_ERRORS) {
    let oldest = 0;
    errors.forEach((e, i) => {
      if (e.lastSeen < errors[oldest].lastSeen) oldest = i;
    });
    errors.splice(oldest, 1);
  }
  errors.push({ path, line, message, count: 1, lastSeen: now });
}

// entries re-recorded meanwhile (the old version is still running) win over the stashed copy
export function restoreRuntimeErrorsIn(errors: RuleRuntimeError[], entries: RuleRuntimeError[]): void {
  for (const e of entries) {
    if (errors.length >= MAX_RUNTIME_ERRORS) return;
    if (!errors.some((r) => r.path === e.path && r.line === e.line)) {
      errors.push(e);
    }
  }
}
