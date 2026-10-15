import { ExactNumber, exactNumberReviver } from './exact-number';

describe('ExactNumber.parse', () => {
  test.each([
    '36028797018963969',
    '-36028797018963969',
    '18446744073709551615',
    // A number holds it, but String() prints ...010
    '36028797018964008',
  ])('keeps the integer %s above 2^53 as its text', (text) => {
    const parsed = ExactNumber.parse(text);
    expect(parsed).toBeInstanceOf(ExactNumber);
    expect(String(parsed)).toBe(text);
  });

  test.each([
    ['42', 42],
    ['-0', -0],
    ['12.5', 12.5],
    ['9007199254740991', 9007199254740991],
  ])('returns %j as a number', (text, expected) => {
    expect(ExactNumber.parse(text)).toBe(expected);
  });

  test.each(['abc', '28-800000000000', '1e'])('returns NaN for the invalid input %j', (text) => {
    expect(ExactNumber.parse(text)).toBeNaN();
  });
});

describe('ExactNumber', () => {
  const big = ExactNumber.parse('36028797018963969') as ExactNumber;

  test('toHex and fromHex keep integers above 2^53, fromHex gives a number when it prints back', () => {
    expect(big.toHex()).toBe('80000000000001');
    expect(String(ExactNumber.fromHex('80000000000001'))).toBe('36028797018963969');
    expect(String(ExactNumber.fromHex('ffffffffffffffff'))).toBe('18446744073709551615');
    expect(ExactNumber.fromHex('00ff')).toBe(255);
  });

  test('JSON.stringify outputs the digits without quotes', () => {
    const config = { id: big, negative: ExactNumber.parse('-36028797018963969'), fraction: 0.5 };
    expect(JSON.stringify(config)).toBe('{"id":36028797018963969,"negative":-36028797018963969,"fraction":0.5}');
  });

  test('equals compares the texts of two ExactNumbers and is false for a number', () => {
    expect(big.equals(ExactNumber.parse('36028797018963969'))).toBe(true);
    expect(big.equals(ExactNumber.parse('36028797018963971'))).toBe(false);
    expect(big.equals(36028797018963970)).toBe(false);
  });
});

describe('exactNumberReviver', () => {
  test('turns only integers above 2^53 into ExactNumber', () => {
    const parsed = JSON.parse(
      '{"id":36028797018963969,"neg":-36028797018963969,"small":5,"f":1.5,"s":"x"}',
      exactNumberReviver,
    );
    expect(parsed.id).toBeInstanceOf(ExactNumber);
    expect(String(parsed.id)).toBe('36028797018963969');
    expect(String(parsed.neg)).toBe('-36028797018963969');
    expect(parsed.small).toBe(5);
    expect(parsed.f).toBe(1.5);
    expect(parsed.s).toBe('x');
  });

  test('leaves values unchanged when the source text is not available', () => {
    expect(exactNumberReviver('id', 36028797018963970)).toBe(36028797018963970);
  });
});
