import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';

/**
 * The two ways a translation of this page can be wrong without any test noticing.
 *
 * Neither shows up in a render test: the page tests mock i18next so that `t` returns the
 * key, which is exactly the layer where both of these live.
 */

// Not `typeof en`: the two bundles are not the same type to tsc, because some other
// section of ru.json is short of keys that en.json has. That divergence is real and
// predates this page - see the test below, which checks the matter section for it.
const labels = (bundle: Record<string, any>) => bundle.matter.labels as Record<string, string>;
const buttons = (bundle: Record<string, any>) => bundle.matter.buttons as Record<string, string>;

describe('values this page interpolates into translations', () => {
  /**
   * i18next escapes interpolated values by default, and this project never turns that
   * off. React escapes again on render, so an escaped value reaches the screen as its
   * entity: a date formatted "17/11/2026, 12:26" was shown as
   * "17&#x2F;11&#x2F;2026, 12:26".
   *
   * Only the English interface showed it. The Russian date format uses dots, and dots
   * are not escaped - so the bug was invisible in half the product.
   */
  it.each([['en', en], ['ru', ru]] as const)('does not escape the date in %s', (_lang, bundle) => {
    const value = labels(bundle)['paired-before'];

    expect(value).toContain('{{- date}}');
    expect(value).not.toMatch(/\{\{\s*date\s*\}\}/);
  });

  it.each([['en', en], ['ru', ru]] as const)('carries no pre-escaped entity in %s', (_lang, bundle) => {
    // A string that already contains an entity would print it literally, the same way.
    for (const [key, value] of Object.entries({ ...labels(bundle), ...buttons(bundle) })) {
      expect(value, key).not.toMatch(/&#x[0-9a-f]+;/i);
    }
  });
});

describe('the two locales of this page', () => {
  /**
   * Adding a key to one bundle and forgetting the other leaves the interface showing a
   * raw key like "matter.labels.column-link" - and only in the language nobody on the
   * team is using that day.
   */
  it.each([['labels', labels], ['buttons', buttons]] as const)('have the same %s', (_what, pick) => {
    expect(Object.keys(pick(en)).sort()).toEqual(Object.keys(pick(ru)).sort());
  });
});
