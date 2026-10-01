import { addZeroToDate, dateYYYYMMDD, splitDate } from './date';

describe('addZeroToDate', () => {
  test('pads single digit', () => {
    expect(addZeroToDate(5)).toBe('05');
  });

  test('does not pad double digit', () => {
    expect(addZeroToDate(12)).toBe('12');
  });
});

describe('dateYYYYMMDD', () => {
  test('formats Date object', () => {
    const d = new Date(2026, 0, 15);
    expect(dateYYYYMMDD(d)).toBe('2026-01-15');
  });

  test('formats with time', () => {
    const d = new Date(2026, 0, 15, 9, 5);
    expect(dateYYYYMMDD(d, true)).toBe('2026-01-15T09:05:00');
  });

  test('returns null for falsy input', () => {
    expect(dateYYYYMMDD(null as any)).toBeNull();
  });

  test('accepts string input', () => {
    expect(dateYYYYMMDD('2026-06-01')).toBe('2026-06-01');
  });
});

describe('splitDate', () => {
  test('returns start and end for short range', () => {
    const result = splitDate('2026-01-01', '2026-01-05', 10);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('2026-01-01');
    expect(result[1]).toBe('2026-01-05');
  });

  test('splits long range into chunks', () => {
    const result = splitDate('2026-01-01', '2026-02-01', 10);
    expect(result.length).toBeGreaterThan(2);
    expect(result[0]).toBe('2026-01-01');
    expect(result[result.length - 1]).toBe('2026-02-01');
  });
});
