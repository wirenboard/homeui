// Plotly draws points in array order and places them by wall clock, so a DST fall-back or a
// backwards step of the system clock makes the line run back and loop. Splitting the data at
// every such shift draws each stretch as a segment of its own.

const wallClock = (time: Date): number => +time - time.getTimezoneOffset() * 60000;

const wallString = (wall: number): string => new Date(wall).toISOString().replace('T', ' ').replace('Z', '');

// A changed offset also covers the spring transition, where the wall clock skips an hour forward
const isTimeShift = (time: Date, previous: Date): boolean =>
  time.getTimezoneOffset() !== previous.getTimezoneOffset() || wallClock(time) < wallClock(previous);

export const findTimeShifts = (times: Date[]): number[] => {
  const shifts: number[] = [];
  for (let i = 1; i < times.length; i += 1) {
    if (isTimeShift(times[i], times[i - 1])) {
      shifts.push(i);
    }
  }
  return shifts;
};

// The hour a DST transition repeats or skips, taken from the offsets themselves rather than from
// the surrounding points. A clock set by hand leaves no such hour and gets no range.
export const shiftedRanges = (times: Date[], shifts: number[]): Array<[string, string]> =>
  shifts.flatMap((shift): Array<[string, string]> => {
    const wall = wallClock(times[shift]);
    const change = (times[shift - 1].getTimezoneOffset() - times[shift].getTimezoneOffset()) * 60000;
    if (change > 0) {
      return [[wallString(wall - change), wallString(wall)]]; // spring: the hour that never happened
    }
    if (change < 0) {
      return [[wallString(wall), wallString(wall - change)]]; // autumn: the hour lived through twice
    }
    return [];
  });

export const middleOfRange = ([from, to]: [string, string]): string =>
  wallString((Date.parse(`${from.replace(' ', 'T')}Z`) + Date.parse(`${to.replace(' ', 'T')}Z`)) / 2);

export const splitByShifts = <T>(values: T[], shifts: number[]): T[][] => {
  if (!shifts.length) {
    return [values];
  }
  const bounds = [0, ...shifts, values.length];
  return bounds.slice(0, -1).map((start, i) => values.slice(start, bounds[i + 1]));
};

export const joinWithGaps = <T>(segments: T[][]): Array<T | null> =>
  segments.flatMap((segment, i) => (i ? [null, ...segment] : segment));
