const diffDates = (start: string, end: string): number => {
  const diffInDays = Math.ceil((+new Date(end) - +new Date(start)) / (24 * 60 * 60000));
  return diffInDays > 0 ? diffInDays : 0;
};

export const dayPlusNDays = (dayString: string, n: number, returnString = true): string | Date => {
  const d = JSON.stringify(new Date(+new Date(dayString) + n * (24 * 60 * 60000))).slice(1, 11);
  return returnString ? d : new Date(d);
};

export const addZeroToDate = (d: number): string => {
  return d < 10 ? '0' + d : '' + d;
};

export const dateYYYYMMDD = (d: Date | string, withTime = false): string | null => {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;

  let output =
    date.getFullYear() +
    '-' +
    addZeroToDate(date.getMonth() + 1) +
    '-' +
    addZeroToDate(date.getDate());
  output = !withTime
    ? output
    : `${output}T${addZeroToDate(date.getHours())}:${addZeroToDate(date.getMinutes())}:00`;
  return output;
};

const getOffset = (): number => {
  return new Date().getTimezoneOffset();
};

export const dayMinusNDays = (dayString: string, n: number, returnString = true, withTime = false): string | Date => {
  const offset = getOffset() / 60;
  const d = JSON.stringify(
    new Date(+new Date(dayString) - n * ((24 + (withTime ? offset : 0)) * 60 * 60000))
  ).slice(1, withTime ? 20 : 11);
  return returnString ? d : new Date(d);
};

/**
 * @description divides the days into segments of N days
 * interval - the parameter for the length of the chart interval if no starting point is specified
 */
export const splitDate = (s: Date | string | null, e: Date | string | null, days = 10, interval = 1): string[] => {
  let end: string = e
    ? (typeof e === 'string' ? e : dateYYYYMMDD(e, true)!)
    : dateYYYYMMDD(new Date(), true)!;
  let start: string = s
    ? (typeof s === 'string' ? s : dateYYYYMMDD(s, true)!)
    : dayMinusNDays(end, interval, true, true) as string;
  const diff = diffDates(start, end);
  if (diff <= days) return [start, end];
  const output: string[] = [start];
  const iter = Math.floor(diff / days) + 1;
  for (let i = 1; i < iter; i++) {
    const actualD = dayPlusNDays(start, i * days) as string;
    output.push(actualD);
    if (i === iter - 1 && actualD !== end) {
      output.push(end);
    }
  }
  return output;
};
