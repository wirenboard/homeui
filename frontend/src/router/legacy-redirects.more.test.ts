import { legacyStaticRedirects, legacyParamRedirects, migrateLegacyUrl } from './legacy-redirects';

describe('legacyStaticRedirects', () => {
  test('maps /access-level to /settings/users', () => {
    expect(legacyStaticRedirects['/access-level']).toBe('/settings/users');
  });

  test('maps /widgets to /dashboards/widgets', () => {
    expect(legacyStaticRedirects['/widgets']).toBe('/dashboards/widgets');
  });
});

describe('legacyParamRedirects', () => {
  test('has configs and rules redirects', () => {
    expect(legacyParamRedirects).toHaveLength(2);
    expect(legacyParamRedirects[0].prefix).toBe('/configs/edit/');
    expect(legacyParamRedirects[1].prefix).toBe('/rules/edit/');
  });
});

describe('migrateLegacyUrl', () => {
  test('redirects static legacy URLs', () => {
    expect(migrateLegacyUrl('/access-level')).toBe('/settings/users');
    expect(migrateLegacyUrl('/serial-config')).toBe('/settings/configs/serial-config');
    expect(migrateLegacyUrl('/logs')).toBe('/settings/logs');
    expect(migrateLegacyUrl('/help')).toBe('/');
  });

  test('redirects parameterized legacy URLs', () => {
    expect(migrateLegacyUrl('/configs/edit/my-config')).toBe('/settings/configs/my-config');
    expect(migrateLegacyUrl('/rules/edit/my-rule.js')).toBe('/rules/my-rule.js');
  });

  test('returns unchanged URL for non-legacy paths', () => {
    expect(migrateLegacyUrl('/dashboards')).toBe('/dashboards');
    expect(migrateLegacyUrl('/settings/system')).toBe('/settings/system');
  });
});
