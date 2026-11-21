// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { authStore } from '@/stores/auth';
import { matterStore } from '@/stores/matter';
import { getMatterStatus } from '@/stores/matter/api';
import { render, screen } from '@/test/render';
import MatterPage from './matter';

const { uiMock } = vi.hoisted(() => ({
  uiMock: { modules: ['matter'], menuItems: [{ id: 'integrations' }] },
}));

vi.mock('@/stores/ui', () => ({ uiStore: uiMock }));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/layouts/page', () => import('@/test/mocks/page-layout'));
vi.mock('@/stores/matter/api', async (importOriginal) => ({
  ...await importOriginal() as Record<string, unknown>,
  getMatterStatus: vi.fn(),
}));

const FINE = {
  version: '1.0.0',
  paired: true,
  fabrics: [{ index: 1, adminFabricLabel: 'Aqara', vendor_id: 4447 }],
  pairing: null,
  network_error: null,
  broker_error: null,
  devices: { configured: 0, exposed: 0, skipped: 0, config_error: null, list: [] },
};

const NO_IPV6 = { code: 'no_ipv6', reason: 'no network card has an IPv6 address', detail: 'eth0 has none' };
const BROKER = { code: 'broker_lost', reason: 'the bridge lost its connection to the MQTT broker' };

const problems = () => screen.queryAllByTestId('page-error').map((element) => element.textContent);

/**
 * The bridge has said both of these in /status since its first slice, and the page did not
 * read them: a controller without IPv6 showed a page that looked ready and a button that
 * failed, and a bridge without its broker showed a list of devices that looked current.
 */
describe('MatterPage, what the bridge says is wrong with it', () => {
  beforeEach(() => {
    vi.mocked(authStore.hasRights).mockReturnValue(true);
    vi.mocked(getMatterStatus).mockReset();
    runInAction(() => {
      matterStore.status = null;
      matterStore.isLoading = true;
      matterStore.isUnreachable = false;
    });
  });

  afterEach(() => {
    matterStore.stopWatching();
  });

  it('says nothing over a bridge that is well, and nothing over one too old to say', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(FINE as any);
    const { unmount } = render(<MatterPage />);
    await screen.findByText('Aqara');
    expect(problems()).toEqual([]);
    unmount();

    const { network_error: _network, broker_error: _broker, ...old } = FINE;
    vi.mocked(getMatterStatus).mockResolvedValue(old as any);
    runInAction(() => {
      matterStore.status = null;
    });
    render(<MatterPage />);
    await screen.findByText('Aqara');
    expect(problems()).toEqual([]);
  });

  it('says in its own words that Matter did not start for want of IPv6', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({ ...FINE, network_error: NO_IPV6 } as any);
    render(<MatterPage />);

    await screen.findByText('Aqara');
    expect(problems()).toEqual(['matter.labels.network-no_ipv6']);
  });

  it('falls back to one general line for a network problem it has no words for', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({
      ...FINE, network_error: { code: 'something_new', reason: 'a reason of a newer service' },
    } as any);
    render(<MatterPage />);

    await screen.findByText('Aqara');
    expect(problems()).toEqual(['matter.labels.network-error']);
  });

  it('says the broker is lost, over the devices and not instead of them', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({ ...FINE, broker_error: BROKER } as any);
    render(<MatterPage />);

    await screen.findByText('Aqara');
    expect(problems()).toEqual(['matter.labels.broker-lost']);
    expect(screen.getByText('matter.labels.devices')).toBeInTheDocument();
  });

  it('says every problem there is and not only the first one', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({
      ...FINE,
      network_error: NO_IPV6,
      broker_error: BROKER,
      devices: { ...FINE.devices, config_error: 'cannot parse /var/lib/wb-converter-ext/devices.yaml' },
    } as any);
    render(<MatterPage />);

    await screen.findByText('Aqara');
    expect(problems()).toEqual([
      'matter.labels.network-no_ipv6',
      'matter.labels.broker-lost',
      'matter.labels.config-error',
    ]);
  });
});
