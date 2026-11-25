// @vitest-environment happy-dom
import type { MatterFabric } from '@/stores/matter';
import { fireEvent, render, screen } from '@/test/render';
import { copyToClipboard } from '@/utils/clipboard';
import { FabricsCard } from './fabrics-card';

vi.mock('@/utils/clipboard', () => ({ copyToClipboard: vi.fn() }));

const NOW = 1_800_000_000_000;

const fabric = (over: Partial<MatterFabric> = {}): MatterFabric => ({
  index: 2,
  adminFabricLabel: '',
  vendor_id: 0x1349,
  vendor_name: 'Apple Home',
  label: { source: 'vendor', text: 'Apple Home' },
  online: true,
  subscriptions: 6,
  heard_at: NOW - 5000,
  devices: [],
  link: { code: 'online', says: 'on the line' },
  ...over,
});

const TOGGLE = { name: 'matter.buttons.fabric-details' };

describe('FabricsCard, the details under a row', () => {
  it('keeps the details closed until asked for, opens them under the row and closes them again', () => {
    render(<FabricsCard fabrics={[fabric()]} now={NOW} onAction={vi.fn()} />);
    const toggle = () => screen.getByRole('button', TOGGLE);

    expect(screen.queryByText('matter.labels.section-pairing')).not.toBeInTheDocument();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle());
    expect(screen.getByText('matter.labels.section-pairing')).toBeInTheDocument();
    expect(screen.getByText('matter.labels.section-status')).toBeInTheDocument();
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle());
    expect(screen.queryByText('matter.labels.section-pairing')).not.toBeInTheDocument();
  });

  it('opens the details of one fabric and not of its neighbour', () => {
    const neighbour = fabric({ index: 3, vendor_id: 0x1384, vendor_name: 'Apple Keychain' });
    render(<FabricsCard fabrics={[fabric(), neighbour]} now={NOW} onAction={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button', TOGGLE)[1]);

    expect(screen.getByText('Apple Keychain (0x1384)')).toBeInTheDocument();
    expect(screen.queryByText('Apple Home (0x1349)')).not.toBeInTheDocument();
  });

  it('hands the check of a fabric to the page, with the fabric it was asked for', () => {
    const onCheck = vi.fn();
    const paired = fabric();
    render(<FabricsCard fabrics={[paired]} now={NOW} onAction={vi.fn()} onCheck={onCheck} />);

    fireEvent.click(screen.getByRole('button', TOGGLE));
    fireEvent.click(screen.getByRole('button', { name: 'matter.buttons.check-link' }));

    expect(onCheck).toHaveBeenCalledWith(paired);
  });

  it('says a check did not go through in the details of the fabric it was for, and of no other', () => {
    const neighbour = fabric({ index: 3, vendor_id: 0x1384, vendor_name: 'Apple Keychain' });
    render(<FabricsCard fabrics={[fabric(), neighbour]} now={NOW} failedCheckIndex={3} onAction={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button', TOGGLE)[0]);
    expect(screen.queryByText('matter.labels.check-failed')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', TOGGLE)[1]);
    expect(screen.getAllByText('matter.labels.check-failed')).toHaveLength(1);
  });

  it('copies the details of a fabric as text, without the button of the check and its hint', () => {
    render(<FabricsCard fabrics={[fabric()]} now={NOW} onAction={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', TOGGLE));
    fireEvent.click(screen.getByRole('button', { name: 'matter.buttons.copy' }));

    const [[text]] = vi.mocked(copyToClipboard).mock.calls;
    expect(text.split('\n').slice(0, 4)).toEqual([
      // The label of the fabric, which this page has a word of its own for.
      'matter.labels.vendor-4937',
      '',
      'matter.labels.section-pairing',
      'matter.labels.fact-vendor: Apple Home (0x1349)',
    ]);
    expect(text).not.toContain('matter.labels.check-hint');
    expect(text).not.toContain('matter.buttons.check-link');
  });
});
