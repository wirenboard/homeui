import { reverseTransformNumber, transformNumber } from './one-wire-number';

describe('transformNumber', () => {
  test('returns "0" for falsy values', () => {
    expect(transformNumber(0)).toBe('0');
    expect(transformNumber(undefined)).toBe('0');
  });

  test('converts number to w1 id format', () => {
    expect(transformNumber(0x28ff6b5a6316_04)).toBe('04-28ff6b5a6316');
  });

  test('pads short hex to 12 chars', () => {
    expect(transformNumber(0x01_02)).toBe('02-000000000001');
  });
});

describe('reverseTransformNumber', () => {
  test('converts w1 id back to number', () => {
    expect(reverseTransformNumber('04-28ff6b5a6316')).toBe(0x28ff6b5a6316_04);
  });

  test('returns 0 for value without dash', () => {
    expect(reverseTransformNumber('invalid')).toBe(0);
  });

  test('handles leading zeros in rest', () => {
    expect(reverseTransformNumber('02-000000000001')).toBe(0x01_02);
  });
});

describe('round-trip', () => {
  test.each([1, 255, 0x28ff6b5a631604])('transformNumber ↔ reverseTransformNumber for %i', (n) => {
    expect(reverseTransformNumber(transformNumber(n))).toBe(n);
  });
});
