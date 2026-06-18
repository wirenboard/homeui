import { decode, encodeControls } from './history-url';

describe('history-url', () => {
  describe('encode / decode round-trip', () => {
    test('round-trips controls and dates', () => {
      const controls = [{ d: 'lamp', c: 'brightness', w: undefined }];
      const start = 1700000000000;
      const end = 1700100000000;

      const encoded = encodeControls(controls, start, end);
      const decoded = decode(encoded);

      expect(decoded.c).toEqual(controls);
      expect(decoded.s.getTime()).toBe(start);
      expect(decoded.e.getTime()).toBe(end);
    });

    test('round-trips without dates', () => {
      const controls = [{ d: 'dev', c: 'ctrl' }];
      const encoded = encodeControls(controls);
      const decoded = decode(encoded);
      expect(decoded.c).toEqual(controls);
      expect(decoded.s).toBeUndefined();
      expect(decoded.e).toBeUndefined();
    });
  });

  describe('decode', () => {
    test('returns empty object for undefined', () => {
      expect(decode(undefined)).toEqual({});
    });

    test('returns empty object for invalid data', () => {
      expect(decode('garbage')).toEqual({});
    });
  });
});
