import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';

const section = (bundle: Record<string, any>, name: string) => bundle.matter[name] as Record<string, string>;

/**
 * Text that a person typed or a program wrote, put into a sentence of this page: the name
 * of a device, the label of an app, the error of the config reader with a path in it.
 *
 * i18next escapes what it interpolates and React escapes again, so "/var/lib" came out as
 * "&#x2F;var&#x2F;lib" and a label with an apostrophe as "&#39;". The date was found
 * first (interpolation.test.ts); these are the rest of the same kind.
 */
const FREE_TEXT: [string, string, string][] = [
  ['labels', 'config-error', 'error'],
  ['labels', 'network-error', 'reason'],
  ['labels', 'status-quiet', 'ago'],
  ['labels', 'fabric-label-instead', 'label'],
  ['labels', 'unpair-where', 'label'],
  ['labels', 'open-device', 'name'],
  ['labels', 'ignored-roles', 'roles'],
  ['buttons', 'fabric-actions', 'label'],
];

describe('free text this page interpolates into translations', () => {
  it.each([['en', en], ['ru', ru]] as const)('is not escaped in %s', (_lang, bundle) => {
    for (const [part, key, value] of FREE_TEXT) {
      const text = section(bundle, part)[key];

      expect(text, key).toContain(`{{- ${value}}}`);
      expect(text, key).not.toMatch(new RegExp(`\\{\\{\\s*${value}\\s*\\}\\}`));
    }
  });

  it.each([['en', en], ['ru', ru]] as const)('has words for each problem the page names in %s', (_lang, bundle) => {
    expect(section(bundle, 'labels')['network-no_ipv6']).toBeTruthy();
    expect(section(bundle, 'labels')['broker-lost']).toBeTruthy();
  });
});
