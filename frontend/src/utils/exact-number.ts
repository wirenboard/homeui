import type { JsonReviver, RawJson } from './types';

// Converts digit by digit, BigInt is not used because Safari below 14 does not have it
const convertBase = (digits: string, fromBase: number, toBase: number): string => {
  const result = [0];
  for (const char of digits) {
    let carry = parseInt(char, fromBase);
    for (let i = 0; i < result.length; i++) {
      carry += result[i] * fromBase;
      result[i] = carry % toBase;
      carry = Math.floor(carry / toBase);
    }
    while (carry) {
      result.push(carry % toBase);
      carry = Math.floor(carry / toBase);
    }
  }
  return result.reverse().map((digit) => digit.toString(toBase)).join('');
};

// An integer a number may round, so only ExactNumber holds it exactly
export const isExactOnlyInteger = (value: unknown): boolean => {
  const number = Number(value);
  return Number.isInteger(number) && !Number.isSafeInteger(number);
};

// An integer above 2^53 kept as its decimal text, so it is not rounded
export class ExactNumber {
  private readonly _text: string;

  private constructor(text: string) {
    this._text = text;
  }

  // An integer a number may round keeps its text, overmatching exactly held ones is harmless
  static parse(text: string): number | ExactNumber {
    const number = Number(text);
    return isExactOnlyInteger(number) ? new ExactNumber(text) : number;
  }

  // Stays a number when it prints back exactly, as reverseTransformNumber gave before
  static fromHex(hex: string): number | ExactNumber {
    const digits = convertBase(hex, 16, 10);
    const number = Number(digits);
    return String(number) === digits ? number : new ExactNumber(digits);
  }

  toString(): string {
    return this._text;
  }

  toJSON(): RawJson {
    return JSON.rawJSON(this._text);
  }

  toHex(): string {
    return convertBase(this._text, 10, 16);
  }

  // A number is compared by text, fromHex keeps 2^54 as a number while parse gives an ExactNumber.
  // A safe integer never equals the text, so it is rejected before building a string
  equals(other: unknown): boolean {
    if (typeof other === 'number') {
      return !Number.isSafeInteger(other) && String(other) === this._text;
    }
    return other instanceof ExactNumber && other._text === this._text;
  }
}

export const isNumberOrExact = (value: unknown): value is number | ExactNumber =>
  typeof value === 'number' || value instanceof ExactNumber;

export const exactNumberEquals = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }
  if (a instanceof ExactNumber) {
    return a.equals(b);
  }
  return b instanceof ExactNumber && b.equals(a);
};

// Rounding never makes an integer above 2^53 safe, so the parsed value is checked before the source text
export const exactNumberReviver: JsonReviver = (_key, value, context) =>
  typeof value === 'number' && isExactOnlyInteger(value) && context?.source ? ExactNumber.parse(context.source) : value;
