// JSON.stringify prints the shortest decimal string that parses back to the same
// double. Above 2^53 that string can denote a different integer: the 1-Wire id
// 0x731a151e64ff28 (32398300328296232) is printed as 32398300328296230, which is
// 0x731a151e64ff26 — a different sensor. Written to wb-mqtt-serial.conf that way,
// the corrupted id goes back to the device and the sensor is rediscovered as new
// on every poll. BigInt(value) yields the exact integer the double holds, so
// 64-bit integers are printed through it and everything else is left to
// JSON.stringify.

const U64_LIMIT = 2n ** 64n;

const stringifyNumber = (value: number): string => {
  if (Number.isInteger(value) && Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    const exact = BigInt(value);
    if (exact > -U64_LIMIT && exact < U64_LIMIT) {
      return exact.toString();
    }
  }
  return JSON.stringify(value);
};

const stringifyValue = (value: unknown): string | undefined => {
  if (typeof value === 'number') {
    return stringifyNumber(value);
  }
  if (value !== null && typeof value === 'object') {
    const toJSON = (value as { toJSON?: () => unknown }).toJSON;
    if (typeof toJSON === 'function') {
      return stringifyValue(toJSON.call(value));
    }
    if (Array.isArray(value)) {
      return `[${value.map((item) => stringifyValue(item) ?? 'null').join(',')}]`;
    }
    const entries: string[] = [];
    for (const [key, item] of Object.entries(value)) {
      const json = stringifyValue(item);
      if (json !== undefined) {
        entries.push(`${JSON.stringify(key)}:${json}`);
      }
    }
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
};

// Drop-in JSON.stringify (without the replacer/space arguments) that keeps 64-bit
// integers exact. A top-level value JSON.stringify drops — undefined, a function —
// becomes 'null' here, the way it does inside an array.
export const stringifyExact = (value: unknown): string => stringifyValue(value) ?? 'null';
