import { Text } from '@codemirror/state';
import type { RuleRuntimeError } from '../types';
import {
  locationBelongsToRule,
  parseRuntimeErrorLocations,
  runtimeErrorSummary,
} from './runtime-error-parse';
import {
  runtimeErrorsForDoc,
  runtimeErrorsToCm,
} from './runtime-errors';

const WRITE_IGNORED = 'control buzzer/enabled: write ignored '
  + '(can\'t convert control value \'123\' (type number) to datatype \'switch\') at /etc/wb-rules/buzz.js:14';
const ES_ERROR = [
  'ECMAScript error: TypeError: cannot read property \'x\' of undefined',
  '    at F (/etc/wb-rules/sub/lights.ts:29:7)',
  '    at <anonymous> (/usr/share/wb-rules-system/scripts/lib.js:120)',
].join('\n');

describe('parseRuntimeErrorLocations', () => {
  it('parses the trailing "at path:line" of a rejected write', () => {
    expect(parseRuntimeErrorLocations(WRITE_IGNORED)).toEqual([{ path: '/etc/wb-rules/buzz.js', line: 14 }]);
  });

  it('parses every frame of a JS traceback, innermost first, ignoring columns', () => {
    expect(parseRuntimeErrorLocations(ES_ERROR)).toEqual([
      { path: '/etc/wb-rules/sub/lights.ts', line: 29 },
      { path: '/usr/share/wb-rules-system/scripts/lib.js', line: 120 },
    ]);
  });

  it('finds nothing in a message without a location', () => {
    expect(parseRuntimeErrorLocations('control a/b: write ignored (no such control)')).toEqual([]);
    expect(parseRuntimeErrorLocations('rule fired at 12:30')).toEqual([]);
  });
});

describe('locationBelongsToRule', () => {
  it('matches a location to the open rule by its virtual path, including subdirectories', () => {
    expect(locationBelongsToRule({ path: '/etc/wb-rules/buzz.js', line: 14 }, 'buzz.js')).toBe(true);
    expect(locationBelongsToRule({ path: '/etc/wb-rules/sub/lights.ts', line: 29 }, 'sub/lights.ts')).toBe(true);
  });

  it('does not let buzz.js claim sub/buzz.js or the other way round', () => {
    expect(locationBelongsToRule({ path: '/etc/wb-rules/sub/buzz.js', line: 1 }, 'buzz.js')).toBe(false);
    expect(locationBelongsToRule({ path: '/etc/wb-rules/buzz.js', line: 1 }, 'sub/buzz.js')).toBe(false);
  });

  it('falls back to a suffix match outside the rules root, and never matches an empty path', () => {
    expect(locationBelongsToRule({ path: '/opt/rules/buzz.js', line: 1 }, 'buzz.js')).toBe(true);
    expect(locationBelongsToRule({ path: '/etc/wb-rules/buzz.js', line: 1 }, '')).toBe(false);
  });
});

describe('runtimeErrorSummary', () => {
  it('summarizes a message by its first line, without the location the diagnostic points at', () => {
    expect(runtimeErrorSummary(ES_ERROR))
      .toBe('ECMAScript error: TypeError: cannot read property \'x\' of undefined');
    expect(runtimeErrorSummary(WRITE_IGNORED)).toBe('control buzzer/enabled: write ignored '
      + '(can\'t convert control value \'123\' (type number) to datatype \'switch\')');
    expect(runtimeErrorSummary('plain text')).toBe('plain text');
  });
});

describe('runtimeErrorsToCm / runtimeErrorsForDoc', () => {
  const doc = Text.of([
    'defineRule("x", {', '  then: function () {', '    dev["buzzer/enabled"] = 123;', '  },', '});',
  ]);
  const err = (over: Partial<RuleRuntimeError> = {}): RuleRuntimeError => ({
    path: '/etc/wb-rules/buzz.js',
    line: 3,
    message: 'control buzzer/enabled: write ignored (bad)',
    count: 1,
    lastSeen: new Date(2026, 7, 18, 19, 5, 7).getTime(),
    ...over,
  });

  it('anchors an error at its line, from the first non-blank character to end of line', () => {
    const [d] = runtimeErrorsToCm(doc, [err()]);
    const line = doc.line(3);
    expect(d.from).toBe(line.from + 4);
    expect(d.to).toBe(line.to);
    expect(d.severity).toBe('error');
    expect(d.source).toBe('runtime');
    expect(d.message).toBe('control buzzer/enabled: write ignored (bad)');
  });

  it('keeps the repeat count and time out of the message (a repeat must not change the diagnostic)', () => {
    const [first] = runtimeErrorsToCm(doc, [err({ count: 1, lastSeen: 1000 })]);
    const [later] = runtimeErrorsToCm(doc, [err({ count: 12, lastSeen: 99000 })]);
    expect(later.message).toBe(first.message);
  });

  it('drops errors whose line is outside the document', () => {
    expect(runtimeErrorsToCm(doc, [err({ line: 0 }), err({ line: 99 })])).toEqual([]);
  });

  it('renders only while the document matches the running content, tolerating CRLF', () => {
    const running = doc.toString();
    expect(runtimeErrorsForDoc(doc, [err()], running)).toHaveLength(1);
    expect(runtimeErrorsForDoc(doc, [err()], running.replace(/\n/g, '\r\n'))).toHaveLength(1);
    expect(runtimeErrorsForDoc(doc, [err()], running + '\n// edited')).toEqual([]);
    expect(runtimeErrorsForDoc(doc, [err()], null)).toEqual([]);
  });
});
