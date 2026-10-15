import { ExactNumber } from './exact-number';

export const W1_ID_FORMAT = 'w1-id';

// A string comes from Cell, which keeps integers a number can't hold exactly as strings
export const transformNumber = (value?: number | string | ExactNumber): string => {
  const id = typeof value === 'string' ? ExactNumber.parse(value) : value;
  if (!id) {
    return '0';
  }
  const hex = id instanceof ExactNumber ? id.toHex() : id.toString(16);
  const lastTwo = hex.slice(-2);
  let rest = hex.slice(0, -2);
  rest = rest.padStart(12, '0');

  return `${lastTwo}-${rest}`;
};

// Returns an ExactNumber only for IDs a number can't hold exactly
export const reverseTransformNumber = (value: string): number | ExactNumber => {
  const [lastTwo, rest] = value.split('-');
  if (!rest) {
    return 0;
  }
  const trimmedRest = rest.replace(/^0+/, '');
  const hex = trimmedRest + lastTwo;

  return ExactNumber.fromHex(hex);
};
