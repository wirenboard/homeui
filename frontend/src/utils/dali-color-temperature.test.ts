import {
  DALI_TC_MASK_VALUE,
  mirekToKelvin,
  kelvinToMirek,
  formatKelvinEditString,
  validateKelvinEditString,
} from './dali-color-temperature';

describe('mirekToKelvin / kelvinToMirek', () => {
  test('converts known values', () => {
    expect(mirekToKelvin(200)).toBe(5000);
    expect(kelvinToMirek(5000)).toBe(200);
  });

  test('conversion is symmetric for exact values', () => {
    expect(mirekToKelvin(kelvinToMirek(4000))).toBe(4000);
  });

  test('returns 0 for zero or negative input', () => {
    expect(mirekToKelvin(0)).toBe(0);
    expect(mirekToKelvin(-1)).toBe(0);
    expect(kelvinToMirek(0)).toBe(0);
  });
});

describe('formatKelvinEditString', () => {
  test('returns empty string for mask value', () => {
    expect(formatKelvinEditString(DALI_TC_MASK_VALUE)).toBe('');
  });

  test('formats known mirek to kelvin string', () => {
    expect(formatKelvinEditString(200)).toBe('5000');
  });

  test('rounds to nearest 10K', () => {
    const result = parseInt(formatKelvinEditString(154), 10);
    expect(result % 10).toBe(0);
  });
});

describe('validateKelvinEditString', () => {
  test('returns undefined for valid value in range', () => {
    expect(validateKelvinEditString('5000', 100, 500)).toBeUndefined();
  });

  test('rejects non-integer input', () => {
    const err = validateKelvinEditString('abc', 100, 500);
    expect(err.key).toBe('json-editor.errors.not-an-integer');
  });

  test('rejects decimal input', () => {
    const err = validateKelvinEditString('5.5', 100, 500);
    expect(err.key).toBe('json-editor.errors.not-an-integer');
  });

  test('rejects empty string', () => {
    const err = validateKelvinEditString('', 100, 500);
    expect(err.key).toBe('json-editor.errors.not-an-integer');
  });

  test('rejects value below range (kelvin too high -> mirek too low)', () => {
    const err = validateKelvinEditString('100000', 100, 500);
    expect(err.key).toBe('json-editor.errors.minmax');
    expect(err.data).toHaveProperty('min');
    expect(err.data).toHaveProperty('max');
  });

  test('rejects value above range (kelvin too low -> mirek too high)', () => {
    const err = validateKelvinEditString('100', 100, 500);
    expect(err.key).toBe('json-editor.errors.minmax');
  });

  test('accepts trimmed whitespace', () => {
    expect(validateKelvinEditString('  5000  ', 100, 500)).toBeUndefined();
  });
});
