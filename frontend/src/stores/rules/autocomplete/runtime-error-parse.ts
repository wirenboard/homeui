import type { RuleRuntimeError } from '../types';
import type { RuntimeErrorLocation } from './types';

// Parsing the engine's console messages into per-file, per-line runtime
// error locations, and the recording policy for the resulting entries.
// Split from runtime-errors.ts on purpose: the rules store (loaded eagerly
// with the app entry) needs these helpers, and this module must stay free
// of CodeMirror imports so the editor bundle does not get dragged into the
// entry chunk.
//
// The engine reports locations as absolute physical paths inside its
// messages, in two shapes:
//   control x/y: write ignored (...) at /etc/wb-rules/foo.js:14
//   ECMAScript error: TypeError: ...\n    at F (/etc/wb-rules/foo.js:29)\n    at ...
// (also watchdog aborts, async rule errors - anything with a JS traceback).
// The editor knows a rule only by its virtual path (foo.js, sub/foo.js), so a
// location belongs to the open file when its path ends with "/<virtualPath>".

// A location always follows "at": the engine appends " at <path>:<line>"
// to write-ignored errors (withRuleCallSite) and JS traceback frames read
// "    at <fn> (<path>:<line>[:<col>])" or "    at <path>:<line>". Rule
// file names may contain spaces, parentheses and unicode, so the path is
// "everything up to the first .js/.ts followed by :digits" - anchoring on
// "at" is what keeps a slash inside the message text ("1/2") from starting
// a bogus path. Colons and newlines never appear inside one location.
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

// a trailing " at /path/file.js:14" on the first line of a message (the
// engine appends it to "write ignored" errors); redundant once the
// diagnostic is anchored to that line
const TRAILING_LOCATION_RX = /\s+at\s+\/[^:\n]*?\.(?:js|ts):\d+(?::\d+)?\s*$/;

// the human-readable part of a console message: its first line, without
// the location the diagnostic already points at
export function runtimeErrorSummary(payload: string): string {
  const nl = payload.indexOf('\n');
  return (nl >= 0 ? payload.slice(0, nl) : payload).trim().replace(TRAILING_LOCATION_RX, '');
}

// where the controller keeps editable rule files (the engine's -editdir);
// under it a location must match the virtual path exactly, so buzz.js
// never claims sub/buzz.js. Anywhere else (non-standard setups) fall back
// to a best-effort suffix match.
export const RULES_ROOT = '/etc/wb-rules/';

export function locationBelongsToRule(location: RuntimeErrorLocation, virtualPath: string): boolean {
  if (virtualPath === '') return false;
  if (location.path.startsWith(RULES_ROOT)) return location.path === RULES_ROOT + virtualPath;
  return location.path.endsWith('/' + virtualPath);
}

// runtime errors are kept for every rule file (they may arrive while the
// user is elsewhere and show up when the file is opened); bounded so a
// misbehaving rule cannot grow the list without limit
const MAX_RUNTIME_ERRORS = 200;

// Record an error-level console message into the per-line runtime error
// list when the engine attributed it to a rule file. The innermost frame
// in a RULE file is where the user can act: the engine's own lib.js and
// the module directories sit on top of the stack for the common throws (an
// invalid control reference, a bad rule definition) and a module's
// internals are not what the editor shows; without a rule frame the
// innermost location is kept (a single-frame message). One entry per
// place, repeats counted: a rule failing every second with the rejected
// value in the engine's text must not grow an entry per value - the latest
// text wins. Mutates the given (mobx-observable) array in place.
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
    // drop the oldest
    let oldest = 0;
    errors.forEach((e, i) => {
      if (e.lastSeen < errors[oldest].lastSeen) oldest = i;
    });
    errors.splice(oldest, 1);
  }
  errors.push({ path, line, message, count: 1, lastSeen: now });
}

// put back errors cleared for a save that failed; anything re-recorded for
// the same place in the meantime (the old version is still running and may
// log on) wins over the stashed copy
export function restoreRuntimeErrorsIn(errors: RuleRuntimeError[], entries: RuleRuntimeError[]): void {
  for (const e of entries) {
    if (errors.length >= MAX_RUNTIME_ERRORS) return;
    if (!errors.some((r) => r.path === e.path && r.line === e.line)) {
      errors.push(e);
    }
  }
}
