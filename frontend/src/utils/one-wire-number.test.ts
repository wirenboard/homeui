import { ExactNumber } from './exact-number';
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

describe('one-wire-number above Number.MAX_SAFE_INTEGER', () => {
  const id = '36028797018963969'; // 0x80000000000001, rounds to ...970 as a number

  test('transformNumber converts an exact decimal ID to w1 format without rounding', () => {
    expect(transformNumber(ExactNumber.parse(id))).toBe('01-800000000000');
  });

  test('reverseTransformNumber returns an ExactNumber that stringifies exactly', () => {
    const result = reverseTransformNumber('01-800000000000');
    expect(result).toBeInstanceOf(ExactNumber);
    expect(JSON.stringify({ id: result })).toBe(`{"id":${id}}`);
  });

  test('round trip keeps the largest 56-bit ID', () => {
    expect(transformNumber(reverseTransformNumber('ff-ffffffffffff'))).toBe('ff-ffffffffffff');
  });

  test('transformNumber accepts the exact decimal text Cell keeps', () => {
    expect(transformNumber(id)).toBe('01-800000000000');
  });
});
