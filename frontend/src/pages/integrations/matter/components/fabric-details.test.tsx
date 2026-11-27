// @vitest-environment happy-dom
import type { MatterFabric } from '@/stores/matter';
import { render, screen, within } from '@/test/render';
import { FabricDetails } from './fabric-details';

const NOW = 1_800_000_000_000;

const fabric = (over: Partial<MatterFabric> = {}): MatterFabric => ({
  index: 2,
  adminFabricLabel: '',
  vendor_id: 0x1349,
  vendor_name: 'Apple Home',
  online: true,
  subscriptions: 6,
  heard_at: NOW - 5000,
  devices: [],
  link: { code: 'online', says: 'on the line' },
  ...over,
});

const show = (over: Partial<MatterFabric> = {}) => render(
  <FabricDetails fabric={fabric(over)} now={NOW} isChecking={false} hasCheckFailed={false} onCheck={vi.fn()} />,
);

/** What stands beside a label in one section of the details. */
const factIn = (section: string, label: string) => {
  const block = screen.getByRole('heading', { level: 4, name: section }).closest('section');
  return within(block).getByText(label).closest('.matter-fact').querySelector('dd').textContent;
};
const pairing = (label: string) => factIn('matter.labels.section-pairing', label);
const status = (label: string) => factIn('matter.labels.section-status', label);

// The controllers of a fabric, its commands and the check have a file of their own:
// fabric-details-controllers.test.tsx.
describe('FabricDetails, the pairing of a fabric', () => {
  it('names the vendor with its number, and by the number alone when the bridge knows no name', () => {
    const { unmount } = show();
    expect(pairing('matter.labels.fact-vendor')).toBe('Apple Home (0x1349)');
    unmount();

    show({ vendor_name: null });
    expect(pairing('matter.labels.fact-vendor')).toBe('0x1349');
  });

  it.each([
    ['the button of the page', { by: 'page' }, 'matter.labels.via-page'],
    ['another fabric', { by: 'app', vendor_id: 0x1349, vendor_name: 'Apple Home' }, 'matter.labels.via-app'],
    ['a pairing older than the memory of the bridge', undefined, 'matter.labels.via-unknown'],
  ] as const)('says a fabric came in through %s', (_what, via, key) => {
    show({ paired_via: via });
    expect(pairing('matter.labels.fact-paired-via')).toBe(key);
  });

  it('says from when until when the certificate holds, and nothing for a bridge that does not tell', () => {
    const { unmount } = show({ certificate: { valid_from: NOW - 1000, valid_until: NOW + 1000 } });
    expect(pairing('matter.labels.fact-certificate')).toBe('matter.labels.certificate-until');
    unmount();

    const forever = show({ certificate: { valid_from: NOW - 1000, valid_until: null } });
    expect(pairing('matter.labels.fact-certificate')).toBe('matter.labels.certificate-forever');
    forever.unmount();

    show();
    expect(screen.queryByText('matter.labels.fact-certificate')).not.toBeInTheDocument();
  });
});

describe('FabricDetails, what a check of the link says', () => {
  it('says the last activity is unknown for a fabric with no connection left', () => {
    show({ heard_at: undefined, online: false });
    expect(status('matter.labels.fact-heard')).toBe('matter.labels.heard-unknown');
  });

  it('says "unknown" for a question the bridge could not put, and that a subscription was dropped', () => {
    show({
      link: {
        code: 'stale',
        says: '',
        checked_at: NOW - 30000,
        summary: { answers_bridge: 'yes', holds_subscriptions: 'dropped' },
      },
    });

    expect(status('matter.labels.fact-in-network')).toBe('matter.labels.reply-unknown');
    expect(status('matter.labels.fact-holds-subscriptions')).toBe('matter.labels.reply-dropped');
  });

  it('says only when a check was made for a bridge that does not sum its answers up', () => {
    show({ link: { code: 'online', says: '', checked_at: NOW - 30000, answers: { subscriptions: 6 } } });

    expect(screen.getByText('matter.labels.fact-checked')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.fact-in-network')).not.toBeInTheDocument();
  });
});
