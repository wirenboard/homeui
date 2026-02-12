export const transformNumber = (value?: number): string => {
  if (!value) {
    return '0';
  }
  const hex = value.toString(16);
  const lastTwo = hex.slice(-2);
  let rest = hex.slice(0, -2);
  rest = rest.padStart(12, '0');

  return `${lastTwo}-${rest}`;
};

export const reverseTransformNumber = (value: string): number => {
  const [lastTwo, rest] = value.split('-');
  const trimmedRest = rest.replace(/^0+/, '');
  const hex = trimmedRest + lastTwo;

  return parseInt(hex, 16);
};
