import { isHex, rgbToHex, hexToRgb } from './color';

describe('isHex', () => {
  test('returns true for valid 7-char hex', () => {
    expect(isHex('#ff00aa')).toBe(true);
    expect(isHex('#000000')).toBe(true);
    expect(isHex('#FFFFFF')).toBe(true);
  });

  test('returns false for null', () => {
    expect(isHex(null)).toBe(false);
  });

  test('returns false for wrong length', () => {
    expect(isHex('#fff')).toBe(false);
    expect(isHex('#ff00aabb')).toBe(false);
  });

  test('returns false without leading #', () => {
    expect(isHex('ff00aa')).toBe(false);
  });

  test('returns false for non-string', () => {
    expect(isHex(null)).toBe(false);
  });
});

describe('rgbToHex', () => {
  test('converts black', () => {
    expect(rgbToHex('0', '0', '0')).toBe('#000000');
  });

  test('converts white', () => {
    expect(rgbToHex('255', '255', '255')).toBe('#ffffff');
  });

  test('converts arbitrary color', () => {
    expect(rgbToHex('255', '128', '0')).toBe('#ff8000');
  });

  test('converts single-digit values', () => {
    expect(rgbToHex('1', '2', '3')).toBe('#010203');
  });
});

describe('hexToRgb', () => {
  test('converts black', () => {
    expect(hexToRgb('#000000')).toBe('0;0;0');
  });

  test('converts white', () => {
    expect(hexToRgb('#ffffff')).toBe('255;255;255');
  });

  test('converts arbitrary color', () => {
    expect(hexToRgb('#ff8000')).toBe('255;128;0');
  });

  test('roundtrips with rgbToHex', () => {
    const hex = rgbToHex('100', '200', '50');
    const rgb = hexToRgb(hex);
    expect(rgb).toBe('100;200;50');
  });
});
