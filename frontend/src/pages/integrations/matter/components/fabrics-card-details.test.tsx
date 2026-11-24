// @vitest-environment happy-dom
import type { MatterDevice, MatterFabric } from '@/stores/matter';
import { fireEvent, render, screen } from '@/test/render';
import { FabricsCard } from './fabrics-card';

const NOW = 1_800_000_000_000;

const device = (did: number, name: string): MatterDevice => ({
  did,
  name,
  type: 'switch',
  module: null,
  area: null,
  roles: ['on_off'],
  exposed: true,
  reason_code: null,
  reason: null,
  state: 'on',
});

const DEVICES = [device(10, 'Kitchen lamp'), device(11, 'Hall socket')];

const fabric = (over: Partial<MatterFabric> = {}): MatterFabric => ({
  index: 2,
  adminFabricLabel: '',
  vendor_id: 0x1349,
  vendor_name: 'Apple Home',
  online: true,
  sessions: 1,
  subscriptions: 6,
  heard_at: NOW - 5000,
  paired_via: { by: 'page' },
  watching: { all: true, dids: [10, 11], missing: [] },
  devices: [],
  link: { code: 'online', says: 'on the line' },
  ...over,
});

describe('FabricsCard, the details under a row', () => {
  const toggle = () => screen.getByRole('button', { name: 'matter.buttons.fabric-details' });

  it('keeps the details closed until asked for, opens them under the row and closes them again', () => {
    render(<FabricsCard fabrics={[fabric()]} devices={DEVICES} now={NOW} onAction={vi.fn()} />);

    expect(screen.queryByText('matter.labels.fact-vendor')).not.toBeInTheDocument();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle());
    expect(screen.getByText('matter.labels.fact-vendor')).toBeInTheDocument();
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle());
    expect(screen.queryByText('matter.labels.fact-vendor')).not.toBeInTheDocument();
  });

  it('opens the details of one fabric and not of its neighbour', () => {
    render(
      <FabricsCard
        fabrics={[fabric(), fabric({ index: 3, vendor_id: 0x1384, vendor_name: 'Apple Keychain' })]}
        devices={DEVICES}
        now={NOW}
        onAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'matter.buttons.fabric-details' })[1]);

    expect(screen.getByText('Apple Keychain (0x1384)')).toBeInTheDocument();
    expect(screen.queryByText('Apple Home (0x1349)')).not.toBeInTheDocument();
  });

  it('hands the check of a fabric to the page, with the fabric it was asked for', () => {
    const onCheck = vi.fn();
    const paired = fabric();
    render(<FabricsCard fabrics={[paired]} devices={DEVICES} now={NOW} onAction={vi.fn()} onCheck={onCheck} />);

    fireEvent.click(toggle());
    fireEvent.click(screen.getByRole('button', { name: 'matter.buttons.check-link' }));

    expect(onCheck).toHaveBeenCalledWith(paired);
  });

  it.each([
    ['left', 'matter.labels.link-is-left'],
    ['removed', 'matter.labels.link-is-removed'],
    ['forgot', 'matter.labels.link-is-forgot'],
    ['offline', 'matter.labels.link-is-offline'],
    ['partly', 'matter.labels.link-is-partly'],
  ] as const)('says in the row itself that a fabric is "%s", as the bridge found', (code, words) => {
    render(
      <FabricsCard
        fabrics={[fabric({ online: false, link: { code, says: '' } })]}
        devices={DEVICES}
        now={NOW}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText(words)).toBeInTheDocument();
  });

  it('keeps the old words of the row for a fabric nobody has asked yet', () => {
    render(
      <FabricsCard
        fabrics={[fabric({ online: false, link: { code: 'quiet', says: '' } })]}
        devices={DEVICES}
        now={NOW}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText('matter.labels.link-offline')).toBeInTheDocument();
  });
});
