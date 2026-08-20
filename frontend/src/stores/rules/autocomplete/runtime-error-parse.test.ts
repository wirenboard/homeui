import {
  locationBelongsToRule, parseRuntimeErrorLocations, RULES_ROOT, runtimeErrorSummary,
} from './runtime-error-parse';

describe('parseRuntimeErrorLocations', () => {
  test('parses the trailing write-ignored location', () => {
    expect(parseRuntimeErrorLocations(
      'control buzzer/enabled: write ignored (bad) at /etc/wb-rules/buzz.js:14',
    )).toEqual([{ path: '/etc/wb-rules/buzz.js', line: 14 }]);
  });

  test('parses traceback frames innermost first, with and without a function name, with a column', () => {
    expect(parseRuntimeErrorLocations(
      'ECMAScript error: TypeError: boom\n'
      + '    at f (/etc/wb-rules/a.js:3:7)\n'
      + '    at <anonymous> (/usr/share/wb-rules-system/scripts/lib.js:200)\n'
      + '    at /etc/wb-rules/b.ts:12',
    )).toEqual([
      { path: '/etc/wb-rules/a.js', line: 3 },
      { path: '/usr/share/wb-rules-system/scripts/lib.js', line: 200 },
      { path: '/etc/wb-rules/b.ts', line: 12 },
    ]);
  });

  test('a file name with spaces keeps its full path', () => {
    expect(parseRuntimeErrorLocations(
      'control a/b: write ignored (bad) at /etc/wb-rules/living room lights.js:5',
    )).toEqual([{ path: '/etc/wb-rules/living room lights.js', line: 5 }]);
  });

  test('a file name with parentheses parses in both the trailing and the frame form', () => {
    expect(parseRuntimeErrorLocations(
      'control a/b: write ignored (bad) at /etc/wb-rules/lights (copy 2).js:6',
    )).toEqual([{ path: '/etc/wb-rules/lights (copy 2).js', line: 6 }]);
    expect(parseRuntimeErrorLocations(
      'ECMAScript error: Error: x\n    at then (/etc/wb-rules/lights (copy 2).ts:29:4)',
    )).toEqual([{ path: '/etc/wb-rules/lights (copy 2).ts', line: 29 }]);
  });

  test('a unicode file name parses', () => {
    expect(parseRuntimeErrorLocations(
      'e at /etc/wb-rules/свет во дворе.js:7',
    )).toEqual([{ path: '/etc/wb-rules/свет во дворе.js', line: 7 }]);
  });

  test('a slash inside the message text does not start a bogus path', () => {
    expect(parseRuntimeErrorLocations(
      'control a/b: write ignored (cannot parse "1/2 (half)") at /etc/wb-rules/a.js:5',
    )).toEqual([{ path: '/etc/wb-rules/a.js', line: 5 }]);
  });

  test('rejects line 0 and messages without a location', () => {
    expect(parseRuntimeErrorLocations('e at /etc/wb-rules/a.js:0')).toEqual([]);
    expect(parseRuntimeErrorLocations('no location in here')).toEqual([]);
  });
});

describe('runtimeErrorSummary', () => {
  test('keeps the first line and strips a trailing location with spaces and parentheses', () => {
    expect(runtimeErrorSummary(
      'control a/b: write ignored (bad) at /etc/wb-rules/lights (copy 2).js:6\nsecond line',
    )).toBe('control a/b: write ignored (bad)');
  });

  test('keeps a first line without a trailing location as is', () => {
    expect(runtimeErrorSummary('ECMAScript error: TypeError: boom\n    at f (/etc/wb-rules/a.js:3)'))
      .toBe('ECMAScript error: TypeError: boom');
  });
});

describe('locationBelongsToRule', () => {
  test('a path with spaces under the rules root matches its virtual path exactly', () => {
    const location = { path: RULES_ROOT + 'living room lights.js', line: 1 };
    expect(locationBelongsToRule(location, 'living room lights.js')).toBe(true);
    expect(locationBelongsToRule(location, 'lights.js')).toBe(false);
  });
});
