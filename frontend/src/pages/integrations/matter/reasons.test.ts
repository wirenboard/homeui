import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';

/**
 * Every reason the bridge can give for leaving a device, or one channel of it, out of Matter.
 *
 * Copied from REASONS in src/matter/endpoints.js of wb-mqtt-matter-bridge, which is a
 * separate repository, so this list cannot be imported and has to be kept by hand. The
 * page survives a missing one - it falls back to the English sentence the service sends
 * - which is exactly why nobody noticed that `unit_unknown` had no translation for a
 * day: the table showed an English sentence in a Russian interface and nothing failed.
 *
 * A code added to the bridge belongs here in the same change. See step Ш14 of
 * docs/adding-a-type.md in that repository.
 */
const REASON_CODES = [
  'adapter_off',
  'type_unsupported',
  'role_missing',
  'command_missing',
  'control_readonly',
  'scale_broken',
  'unit_unknown',
  'build_failed',
  'role_unused',
  'role_needs_others',
  'silent',
];

describe('the reasons a device is not given to Matter', () => {
  it.each([['ru', ru], ['en', en]])('has a %s phrase for every one of them', (_name, dictionary) => {
    const labels = (dictionary as any).matter.labels;

    expect(REASON_CODES.filter((code) => !labels[`reason-${code}`])).toEqual([]);
  });

  it('has no phrase left over from a reason the bridge no longer gives', () => {
    const extra = Object.keys((ru as any).matter.labels)
      .filter((key) => key.startsWith('reason-'))
      .map((key) => key.slice('reason-'.length))
      .filter((code) => !REASON_CODES.includes(code));

    expect(extra).toEqual([]);
  });
});
