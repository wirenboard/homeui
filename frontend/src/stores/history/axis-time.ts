// Plotly always converts x values through a Date object, applying each point's own timezone
// offset, so on DST fall-back the axis goes backwards and the line draws a loop. Timestamp
// strings are the only input it takes literally, so points are formatted as wall clock using
// a single offset taken for the end of the displayed range.

export const getAxisOffset = (date?: Date | null): number => -(date ?? new Date()).getTimezoneOffset() * 60000;

export const toAxisValue = (time: number, offset: number): string =>
  new Date(time + offset).toISOString().replace('T', ' ').replace('Z', '');

export const fromAxisValue = (value: string | number, offset: number): number => {
  if (typeof value === 'number') {
    return value - offset;
  }
  const wallClock = Date.parse(`${value.replace(' ', 'T')}Z`);
  return Number.isNaN(wallClock) ? +new Date(value) : wallClock - offset;
};
