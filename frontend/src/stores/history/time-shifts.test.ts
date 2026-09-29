import { findTimeShifts, joinWithGaps, middleOfRange, shiftedRanges, splitByShifts } from './time-shifts';

const at = (...iso: string[]) => iso.map((value) => new Date(value));

describe('time-shifts', () => {
  test('finds nothing while time only moves forward', () => {
    expect(findTimeShifts(at('2026-01-01T00:00:00Z', '2026-01-01T00:01:00Z'))).toEqual([]);
  });

  test('finds the point where a DST fall-back repeats the hour on the wall clock', () => {
    // Europe/Berlin, 26.10.2025: timestamps keep growing, but 02:30 CEST is followed by 02:00 CET.
    // The offset is faked so the test does not depend on the timezone it runs in.
    const fallBack = +new Date('2025-10-26T01:00:00Z');
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockImplementation(function mocked(this: Date) {
      return +this < fallBack ? -120 : -60;
    });

    const times = at(
      '2025-10-26T00:00:00Z',
      '2025-10-26T00:30:00Z',
      '2025-10-26T01:00:00Z',
      '2025-10-26T01:30:00Z',
    );

    expect(times.map((time) => +time)).toEqual([...times].sort((a, b) => +a - +b).map((time) => +time));
    expect(findTimeShifts(times)).toEqual([2]);

    vi.restoreAllMocks();
  });

  test('finds the spring transition too, where the wall clock skips an hour forward', () => {
    // Europe/Berlin, 30.03.2025: 01:59 CET is followed by 03:00 CEST
    const springForward = +new Date('2025-03-30T01:00:00Z');
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockImplementation(function mocked(this: Date) {
      return +this < springForward ? -60 : -120;
    });

    const times = at(
      '2025-03-30T00:30:00Z',
      '2025-03-30T00:59:00Z',
      '2025-03-30T01:00:00Z',
      '2025-03-30T01:30:00Z',
    );

    expect(findTimeShifts(times)).toEqual([2]);

    vi.restoreAllMocks();
  });

  test('finds every point where the clock was stepped backwards, not just the first', () => {
    const times = at(
      '2026-01-01T10:00:00Z',
      '2026-01-01T09:00:00Z',
      '2026-01-01T11:00:00Z',
      '2026-01-01T10:30:00Z',
    );
    expect(findTimeShifts(times)).toEqual([1, 3]);
  });

  test('covers the skipped hour in spring, regardless of where the surrounding points fall', () => {
    const springForward = +new Date('2025-03-30T01:00:00Z');
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockImplementation(function mocked(this: Date) {
      return +this < springForward ? -60 : -120;
    });

    // last point before the transition is 01:55 on the wall clock, the band must still start at 02:00
    const times = at('2025-03-30T00:55:00Z', '2025-03-30T01:00:00Z');

    expect(shiftedRanges(times, findTimeShifts(times)))
      .toEqual([['2025-03-30 02:00:00.000', '2025-03-30 03:00:00.000']]);

    vi.restoreAllMocks();
  });

  test('covers the repeated hour in autumn', () => {
    const fallBack = +new Date('2025-10-26T01:00:00Z');
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockImplementation(function mocked(this: Date) {
      return +this < fallBack ? -120 : -60;
    });

    const times = at('2025-10-26T00:55:00Z', '2025-10-26T01:00:00Z');

    expect(shiftedRanges(times, findTimeShifts(times)))
      .toEqual([['2025-10-26 02:00:00.000', '2025-10-26 03:00:00.000']]);

    vi.restoreAllMocks();
  });

  test('marks no hour when the clock was set by hand, since the offset did not change', () => {
    const times = at('2025-06-16T12:00:00Z', '2025-06-16T11:00:00Z');
    const shifts = findTimeShifts(times);

    expect(shifts).toEqual([1]);
    expect(shiftedRanges(times, shifts)).toEqual([]);
  });

  test('puts the label in the middle of the band', () => {
    expect(middleOfRange(['2025-03-30 02:00:00.000', '2025-03-30 03:00:00.000']))
      .toBe('2025-03-30 02:30:00.000');
  });

  test('keeps values as one segment when there are no shifts', () => {
    expect(splitByShifts([1, 2, 3], [])).toEqual([[1, 2, 3]]);
  });

  test('cuts values into a segment per shift', () => {
    expect(splitByShifts([1, 2, 3, 4, 5], [2, 4])).toEqual([[1, 2], [3, 4], [5]]);
  });

  test('separates segments with a null so plotly breaks the line', () => {
    expect(joinWithGaps([[1, 2], [3]])).toEqual([1, 2, null, 3]);
  });

  test('leaves a single segment untouched', () => {
    expect(joinWithGaps([[1, 2]])).toEqual([1, 2]);
  });
});
