import { fromAxisValue, getAxisOffset, toAxisValue } from './axis-time';

// Europe/Berlin around the fall-back of 26.10.2025: 01:00 UTC is when CEST (+2) becomes CET (+1)
const CEST = 2 * 60 * 60000;
const CET = 60 * 60000;

describe('axis-time', () => {
  test('offset of a date is the inverse of its timezone offset, in milliseconds', () => {
    const date = new Date('2025-10-26T03:00:00Z');
    expect(getAxisOffset(date)).toBe(-date.getTimezoneOffset() * 60000);
  });

  test('formats a point as a wall clock string plotly takes literally', () => {
    const time = new Date('2026-01-01T09:00:00Z').getTime();
    expect(toAxisValue(time, 3 * 60 * 60000)).toBe('2026-01-01 12:00:00.000');
  });

  test('a single offset keeps the axis monotonic across a fall-back', () => {
    // both points are 02:30 on the wall clock — first in CEST, then in CET
    const beforeShift = new Date('2025-10-26T00:30:00Z').getTime();
    const afterShift = new Date('2025-10-26T01:30:00Z').getTime();

    expect(toAxisValue(afterShift, CET) > toAxisValue(beforeShift, CET)).toBe(true);
  });

  test('per-point offsets repeat the same wall clock, which is what the single offset avoids', () => {
    const beforeShift = new Date('2025-10-26T00:30:00Z').getTime();
    const afterShift = new Date('2025-10-26T01:30:00Z').getTime();

    expect(toAxisValue(afterShift, CET)).toBe(toAxisValue(beforeShift, CEST));
  });

  test('a range entirely before the fall-back keeps summer time labels', () => {
    const time = new Date('2025-10-25T12:00:00Z').getTime();
    expect(toAxisValue(time, CEST)).toBe('2025-10-25 14:00:00.000');
  });

  test('a range entirely after the fall-back keeps winter time labels', () => {
    const time = new Date('2025-10-27T12:00:00Z').getTime();
    expect(toAxisValue(time, CET)).toBe('2025-10-27 13:00:00.000');
  });

  test('converts back and forth without losing the original time', () => {
    const time = new Date('2026-01-01T12:00:00Z').getTime();
    expect(fromAxisValue(toAxisValue(time, CET), CET)).toBe(time);
  });

  test('parses the space-separated range edge plotly reports on zoom', () => {
    const offset = 3 * 60 * 60000;
    expect(fromAxisValue('2026-01-01 12:00:00.0000', offset)).toBe(new Date('2026-01-01T09:00:00Z').getTime());
  });

  test('parses a numeric range edge', () => {
    const offset = 3 * 60 * 60000;
    expect(fromAxisValue(offset + 1000, offset)).toBe(1000);
  });
});
