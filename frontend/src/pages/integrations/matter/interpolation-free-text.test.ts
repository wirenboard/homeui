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
  ['labels', 'unpair-where', 'label'],
  ['labels', 'open-device', 'name'],
  ['labels', 'apps-no', 'names'],
  ['labels', 'apps-unknown', 'names'],
  ['labels', 'group-as-room', 'group'],
  ['buttons', 'fabric-actions', 'label'],
  ['buttons', 'device-details', 'name'],
];

// What the page interpolates escaped: counts, the number of a fabric, a revision, and
// what is left of the countdown as m:ss.
const NUMBERS = ['count', 'of', 'index', 'revision', 'shown', 'left'];

// Every text the page can put over itself: see `errors` in matter.tsx.
const PAGE_PROBLEMS = [
  'unavailable', 'starting', 'unreachable', 'network-no_ipv6', 'network-config_unread', 'network-error',
  'broker-lost', 'config-error',
];

describe('free text this page interpolates into translations', () => {
  it.each([['en', en], ['ru', ru]] as const)('is not escaped in %s', (_lang, bundle) => {
    for (const [part, key, value] of FREE_TEXT) {
      const text = section(bundle, part)[key];

      expect(text, key).toContain(`{{- ${value}}}`);
      expect(text, key).not.toMatch(new RegExp(`\\{\\{\\s*${value}\\s*\\}\\}`));
    }
  });

  /**
   * The list above is the texts somebody thought of. The rule the other way round does not
   * depend on that: whatever is interpolated is free text and goes unescaped, but for the
   * numbers the page counts itself and the countdown.
   */
  it.each([['en', en], ['ru', ru]] as const)('escapes nothing but its own numbers in %s', (_lang, bundle) => {
    const escaped = ['labels', 'buttons'].flatMap((part) => Object.entries(section(bundle, part))
      .flatMap(([key, text]) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)]
        .filter(([, value]) => !NUMBERS.includes(value))
        .map(([, value]) => `${part}.${key}: ${value}`)));

    expect(escaped).toEqual([]);
  });

  it.each([['en', en], ['ru', ru]] as const)('has words for each problem over the page in %s', (_lang, bundle) => {
    for (const key of PAGE_PROBLEMS) {
      expect(section(bundle, 'labels')[key], key).toBeTruthy();
    }
  });
});
