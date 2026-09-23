import { stringifyExact } from './exact-json';

// 1-Wire id 28-731a151e64ff, the value from the report this fix comes from.
const W1_ID = 0x731a151e64ff_28;

describe('stringifyExact', () => {
  test('keeps a 64-bit 1-Wire id exact where JSON.stringify shifts it by 2', () => {
    expect(stringifyExact({ bus2_sens1_id: W1_ID })).toBe('{"bus2_sens1_id":32398300328296232}');
    expect(JSON.stringify({ bus2_sens1_id: W1_ID })).toBe('{"bus2_sens1_id":32398300328296230}');
  });

  test('rewrites an already corrupted id: it parses to the same double, so the exact form is restored', () => {
    const corrupted = Number('32398300328296230');

    expect(corrupted).toBe(W1_ID);
    expect(stringifyExact({ bus2_sens1_id: corrupted })).toBe('{"bus2_sens1_id":32398300328296232}');
  });

  test('keeps 64-bit integers exact deep inside a serial config shape', () => {
    const config = { ports: [{ devices: [{ slave_id: 139, parameters: { bus2_sens1_id: W1_ID } }] }] };

    expect(stringifyExact(config)).toContain('"bus2_sens1_id":32398300328296232');
    expect(JSON.parse(stringifyExact(config))).toEqual(config);
  });

  test.each([
    ['safe integers', { id: 71127997480, zero: 0, negative: -42 }],
    ['the 2^53 boundary itself', { v: Number.MAX_SAFE_INTEGER, w: 2 ** 53 }],
    ['values too big for u64, left in exponent form', { v: 1e21, w: -1e21 }],
    ['fractions', { a: 1.5, b: -0.25, c: 1e-7 }],
    ['strings needing escaping', { s: 'ка"вы\\чки\nи\tтабы' }],
    ['null, booleans and arrays', { n: null, t: true, f: false, arr: [1, 'x', null, [2]] }],
    ['an empty object and an empty array', { o: {}, a: [] }],
  ])('matches JSON.stringify for %s', (_name, value) => {
    expect(stringifyExact(value)).toBe(JSON.stringify(value));
  });

  test('drops undefined and function properties, and nulls them inside arrays, like JSON.stringify', () => {
    const value = { u: undefined, f: () => 1, kept: 1, arr: [1, undefined, () => 2] };

    expect(stringifyExact(value)).toBe(JSON.stringify(value));
  });

  test('delegates to toJSON, so a Date still serializes as its ISO string', () => {
    const value = { at: new Date('2026-09-22T12:00:00.000Z') };

    expect(stringifyExact(value)).toBe(JSON.stringify(value));
  });

  test('serializes bare values the same way JSON.stringify does', () => {
    expect(stringifyExact(W1_ID)).toBe('32398300328296232');
    expect(stringifyExact('text')).toBe('"text"');
    expect(stringifyExact(null)).toBe('null');
    expect(stringifyExact(undefined)).toBe('null');
  });
});
