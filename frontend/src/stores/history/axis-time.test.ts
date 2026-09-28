import { fromAxisValue, getAxisOffset, toAxisValue } from './axis-time';

describe('axis-time', () => {
  test('offset of a date is the inverse of its timezone offset, in milliseconds', () => {
    const date = new Date('2025-10-26T03:00:00Z');
    expect(getAxisOffset(date)).toBe(-date.getTimezoneOffset() * 60000);
  });

  test('formats a point as a wall clock string plotly takes literally', () => {
    const time = new Date('2026-01-01T09:00:00Z').getTime();
    expect(toAxisValue(time, 3 * 60 * 60000)).toBe('2026-01-01 12:00:00.000');
  });

  test('a single offset keeps the axis monotonic across a DST fall-back', () => {
    // Europe/Berlin: 00:30 UTC is 02:30 CEST, 01:30 UTC is 02:30 CET — the same wall clock
    const beforeShift = new Date('2025-10-26T00:30:00Z').getTime();
    const afterShift = new Date('2025-10-26T01:30:00Z').getTime();
    const offset = getAxisOffset(new Date('2025-10-26T01:30:00Z'));

    expect(toAxisValue(afterShift, offset) > toAxisValue(beforeShift, offset)).toBe(true);
  });

  test('per-point offsets repeat the same wall clock, which is what the single offset avoids', () => {
    const beforeShift = new Date('2025-10-26T00:30:00Z');
    const afterShift = new Date('2025-10-26T01:30:00Z');
    const perPoint = (date: Date) => toAxisValue(date.getTime(), getAxisOffset(date));

    expect(perPoint(afterShift) <= perPoint(beforeShift)).toBe(true);
  });

  test('converts back and forth without losing the original time', () => {
    const time = new Date('2026-01-01T12:00:00Z').getTime();
    const offset = getAxisOffset(new Date(time));
    expect(fromAxisValue(toAxisValue(time, offset), offset)).toBe(time);
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
