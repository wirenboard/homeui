// @vitest-environment happy-dom
import type { MatterFabric } from '@/stores/matter';
import { fireEvent, render, screen } from '@/test/render';
import { FabricsCard } from './fabrics-card';

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
  it('has nothing to open while the page is not set to show the details, and still says the status', () => {
    render(<FabricsCard fabrics={[fabric()]} now={NOW} onAction={vi.fn()} />);

    expect(screen.queryByRole('button', TOGGLE)).not.toBeInTheDocument();
    expect(screen.getByText('matter.labels.column-status')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.section-pairing')).not.toBeInTheDocument();
  });

  it('keeps the details closed until asked for, opens them under the row and closes them again', () => {
    render(<FabricsCard fabrics={[fabric()]} now={NOW} hasDetails onAction={vi.fn()} />);
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
    render(<FabricsCard fabrics={[fabric(), neighbour]} now={NOW} hasDetails onAction={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button', TOGGLE)[1]);

    expect(screen.getByText('Apple Keychain (0x1384)')).toBeInTheDocument();
    expect(screen.queryByText('Apple Home (0x1349)')).not.toBeInTheDocument();
  });

  it('hands the check of a fabric to the page, with the fabric it was asked for', () => {
    const onCheck = vi.fn();
    const paired = fabric();
    render(<FabricsCard fabrics={[paired]} now={NOW} hasDetails onAction={vi.fn()} onCheck={onCheck} />);

    fireEvent.click(screen.getByRole('button', TOGGLE));
    fireEvent.click(screen.getByRole('button', { name: 'matter.buttons.check-link' }));

    expect(onCheck).toHaveBeenCalledWith(paired);
  });
});
