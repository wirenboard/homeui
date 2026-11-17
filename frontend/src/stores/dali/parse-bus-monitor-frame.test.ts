import { lineFilterKey } from './parse-bus-monitor-frame';

describe('lineFilterKey', () => {
  test.each([
    // FF16 (2-byte hex) short-addressed commands
    ['12:34:56.812 >> a3fa QueryActualLevel(A5) - 00fe 254', 'FF16:5'],
    ['12:34:56.900 >> a3a0 Off(A5)', 'FF16:5'],
    ['12:34:56.950 >> a3fa QueryActualLevel(A5) - no power on bus', 'FF16:5'],
    ['12:34:57.001 << a380 DAPC(A3, 128) (fc: 42)', 'FF16:3'],
    ['12:34:56.000 >> a3ff Off(A63)', 'FF16:63'],
    // FF24 (3-byte hex) short-addressed command
    ['18:52:36.374 >> 01fe43 QueryControlGearGroups(A0)', 'FF24:0'],
    // broadcast: recognized command, no address — type by hex length
    ['12:34:57.001 << a3fe Off() (fc: 42)', 'FF16:broadcast'],
    ['12:34:57.001 << a3fe Off (fc: 42)', 'FF16:broadcast'],
    ['12:34:57.002 << a3fe DAPC(128) (fc: 43)', 'FF16:broadcast'],
    ['12:34:57.003 >> 01fe43 Off()', 'FF24:broadcast'],
  ])('classifies %s -> %s', (line, expected) => {
    expect(lineFilterKey(line)).toBe(expected);
  });

  test.each([
    ['12:34:57.050 << ff93 FF16 (fc: 43)'],
    ['12:34:57.100 << 002a BF8 (fc: 44)'],
    ['12:34:57.000 >> a3a0 Off(G3)'],
    [''],
  ])('returns null for unfilterable lines: %s', (line) => {
    expect(lineFilterKey(line)).toBeNull();
  });
});
