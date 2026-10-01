import { legacyParamRedirects, legacyStaticRedirects, migrateLegacyUrl } from './legacy-redirects';

describe('migrateLegacyUrl', () => {
  describe.each(
    Object.entries(legacyStaticRedirects).map(([from, to]) => ({ from, to })),
  )('static redirect $from', ({ from, to }) => {
    test(`→ ${to}`, () => {
      expect(migrateLegacyUrl(from)).toBe(to);
    });
  });

  describe.each(legacyParamRedirects)('param redirect $prefix*', ({ prefix, target }) => {
    test('redirects with trailing segment', () => {
      expect(migrateLegacyUrl(`${prefix}foo`)).toBe(`${target}foo`);
    });

    test('preserves nested path after prefix', () => {
      expect(migrateLegacyUrl(`${prefix}bar/baz`)).toBe(`${target}bar/baz`);
    });
  });

  test('returns unknown URLs unchanged', () => {
    expect(migrateLegacyUrl('/unknown')).toBe('/unknown');
    expect(migrateLegacyUrl('/some/deep/path')).toBe('/some/deep/path');
  });

  test('returns empty string unchanged', () => {
    expect(migrateLegacyUrl('')).toBe('');
  });
});
