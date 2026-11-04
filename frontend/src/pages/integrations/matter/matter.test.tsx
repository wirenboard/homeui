// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { authStore } from '@/stores/auth';
import { configuratorStore } from '@/stores/configurator';
import { matterStore } from '@/stores/matter';
import { getMatterStatus } from '@/stores/matter/api';
import { render, screen, fireEvent, waitFor } from '@/test/render';
import { copyToClipboard } from '@/utils/clipboard';
import MatterPage from './matter';

const { uiMock, navigateMock } = vi.hoisted(() => ({
  uiMock: { modules: ['matter'], menuItems: [{ id: 'integrations' }] },
  navigateMock: vi.fn(),
}));

vi.mock('@/stores/ui', () => ({ uiStore: uiMock }));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/layouts/page', () => import('@/test/mocks/page-layout'));
// Only the transport is mocked: the store decides what the page sees, and that decision
// is what these tests are about.
vi.mock('@/stores/matter/api', async (importOriginal) => ({
  // pairingQrUrl stays real: the test of the picture URL must check the function the
  // page uses, not a copy of it written here.
  ...await importOriginal() as Record<string, unknown>,
  getMatterStatus: vi.fn(),
}));
vi.mock('@/utils/clipboard', () => ({ copyToClipboard: vi.fn() }));
// Only useNavigate: the page is rendered inside a real MemoryRouter, and Link has to
// stay the real one.
vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal() as Record<string, unknown>,
  useNavigate: () => navigateMock,
}));
vi.mock('@/assets/icons/copy.svg', () => ({ default: () => null }));
// The shared tooltip mock drops the text, and the text is what the copy button reports.
vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children, text }: any) => <div data-tooltip={text}>{children}</div>,
}));

/** A device of a WB module: one source, and the module is that source. */
const WB_DEVICE = {
  did: 10,
  name: 'Kitchen light',
  type: 'switch',
  module: 'wb-mr6c_21',
  area: 'Kitchen',
  roles: ['on_off'],
  exposed: true,
  reason_code: null,
  reason: null,
  state: 'on',
};

/** A device composed by hand: its services read controls of other devices. */
const OWN_DEVICE = {
  did: 11,
  name: 'Boiler',
  type: 'temperature_sensor',
  module: 'Boiler',
  area: null,
  roles: ['temperature'],
  exposed: false,
  reason_code: 'type_unsupported',
  reason: 'type temperature_sensor cannot be exposed yet',
  state: null,
};

const NOT_PAIRED = {
  version: '1.0.0',
  paired: false,
  fabrics: [],
  pairing: { manual_code: '23331712339', payload: 'MT:Y.K9042C00KA0648G00', qr_version: 'abcdef12' },
  devices: {
    configured: 2, exposed: 1, skipped: 0, config_error: null, list: [WB_DEVICE, OWN_DEVICE],
  },
};

const PAIRED = {
  ...NOT_PAIRED,
  paired: true,
  pairing: null,
  fabrics: [{ index: 1, label: 'Yandex', vendor_id: 4660 }],
};

describe('MatterPage', () => {
  beforeEach(() => {
    vi.mocked(copyToClipboard).mockClear();
    navigateMock.mockClear();
    configuratorStore.select(null);
    vi.mocked(authStore.hasRights).mockReturnValue(true);
    vi.mocked(getMatterStatus).mockClear();
    vi.mocked(getMatterStatus).mockResolvedValue(NOT_PAIRED as any);
    uiMock.modules = ['matter'];
    uiMock.menuItems = [{ id: 'integrations' }];
    runInAction(() => {
      matterStore.status = null;
      matterStore.isLoading = true;
      matterStore.isUnreachable = false;
    });
  });

  afterEach(() => {
    matterStore.stopWatching();
  });

  it('shows the pairing code the service gave it', async () => {
    render(<MatterPage />);

    expect(await screen.findByText('2333-171-2339')).toBeInTheDocument();
    expect(screen.getByText('MT:Y.K9042C00KA0648G00')).toBeInTheDocument();
  });

  it('points the picture at the service, with the version and not the payload', async () => {
    render(<MatterPage />);

    const qr = await screen.findByAltText('matter.labels.qr-alt');
    expect(qr).toHaveAttribute('src', '/matter/pairing.svg?v=abcdef12');
  });

  it('copies the manual code without the grouping dashes', async () => {
    render(<MatterPage />);
    await screen.findByText('2333-171-2339');

    fireEvent.click(screen.getByLabelText('matter.buttons.copy: matter.labels.manual-code'));

    expect(copyToClipboard).toHaveBeenCalledWith('23331712339');
  });

  it('drops the pairing card once the bridge is paired, and names the app', async () => {
    // The pairing window closes with the first pairing and the code stops working, so
    // the page must not keep it on screen.
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED as any);
    render(<MatterPage />);

    expect(await screen.findByText('Yandex')).toBeInTheDocument();
    expect(screen.queryByAltText('matter.labels.qr-alt')).not.toBeInTheDocument();
    expect(screen.queryByText('matter.labels.pairing')).not.toBeInTheDocument();
  });

  it('says how many devices the config gives to Matter', async () => {
    render(<MatterPage />);

    expect(await screen.findByText(/matter\.labels\.devices-count/)).toBeInTheDocument();
    expect(screen.queryByText(/matter\.labels\.devices-skipped/)).not.toBeInTheDocument();
  });

  it('mentions the devices it skipped', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({
      ...NOT_PAIRED,
      devices: { ...NOT_PAIRED.devices, skipped: 1 },
    } as any);
    render(<MatterPage />);

    expect(await screen.findByText(/matter\.labels\.devices-skipped/)).toBeInTheDocument();
  });

  it('warns about a config it cannot read, and still shows the pairing data', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({
      ...NOT_PAIRED,
      devices: { ...NOT_PAIRED.devices, config_error: 'cannot parse devices.yaml' },
    } as any);
    render(<MatterPage />);

    expect(await screen.findByTestId('page-error')).toHaveTextContent('matter.labels.config-error');
    expect(screen.getByText('2333-171-2339')).toBeInTheDocument();
  });

  it('says the service does not answer when it does not', async () => {
    vi.mocked(getMatterStatus).mockRejectedValue(new Error('502'));
    render(<MatterPage />);

    expect(await screen.findByTestId('page-error')).toHaveTextContent('matter.labels.unreachable');
    expect(screen.queryByAltText('matter.labels.qr-alt')).not.toBeInTheDocument();
  });

  it('asks nothing of a service that is not installed', async () => {
    uiMock.modules = ['alice'];
    render(<MatterPage />);

    expect(await screen.findByTestId('page-error')).toHaveTextContent('matter.labels.unavailable');
    expect(getMatterStatus).not.toHaveBeenCalled();
  });

  it('asks nothing when the operator is not an admin', async () => {
    // The endpoint is closed to anyone below admin anyway, and PageLayout shows the page
    // of missing rights, so the request would only ever come back 403.
    vi.mocked(authStore.hasRights).mockReturnValue(false);
    render(<MatterPage />);

    await waitFor(() => expect(getMatterStatus).not.toHaveBeenCalled());
  });

  it('names an app that gave no name of its own', async () => {
    // Yandex leaves the label of its fabric empty, and a bullet with nothing next to it
    // is what the page showed before. See docs/ecosystems.md of the bridge, finding Я3.
    vi.mocked(getMatterStatus).mockResolvedValue({
      ...PAIRED,
      fabrics: [{ index: 1, label: '', vendor_id: 4911 }],
    } as any);
    render(<MatterPage />);

    expect(await screen.findByText('matter.labels.vendor-yandex')).toBeInTheDocument();
  });

  it('falls back to the vendor number for an app it does not know', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({
      ...PAIRED,
      fabrics: [{ index: 1, label: '', vendor_id: 1234 }],
    } as any);
    render(<MatterPage />);

    expect(await screen.findByText('matter.labels.app-unknown')).toBeInTheDocument();
  });

  it('lists the devices of the config, not only how many there are', async () => {
    render(<MatterPage />);

    expect(await screen.findByText('Kitchen light')).toBeInTheDocument();
    expect(screen.getByText('configurator.types.switch.name')).toBeInTheDocument();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Boiler')).toBeInTheDocument();
    expect(screen.getByText('configurator.types.temperature_sensor.name')).toBeInTheDocument();
  });

  it('shows the value of an exposed device and the reason of one that is not', async () => {
    render(<MatterPage />);
    await screen.findByText('Kitchen light');

    expect(screen.getByText('matter.labels.state-on')).toBeInTheDocument();
    // The title is the translated code, not the English sentence of the service.
    const notGiven = screen.getByText('matter.labels.not-exposed');
    expect(notGiven).toHaveAttribute('title', 'matter.labels.reason-type_unsupported');
  });

  it('falls back to the sentence of the service when there is no code', async () => {
    // Nothing to translate: the words of the service are better than nothing. A code
    // this page does not know yet takes the same path through the default value of
    // i18next, which the stub here cannot show.
    vi.mocked(getMatterStatus).mockResolvedValue({
      ...NOT_PAIRED,
      devices: {
        ...NOT_PAIRED.devices,
        list: [{ ...OWN_DEVICE, reason_code: null, reason: 'something new happened' }],
      },
    } as any);
    render(<MatterPage />);

    expect(await screen.findByText('matter.labels.not-exposed'))
      .toHaveAttribute('title', 'something new happened');
  });

  it('marks an exposed device whose control said nothing yet', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({
      ...NOT_PAIRED,
      devices: { ...NOT_PAIRED.devices, list: [{ ...WB_DEVICE, state: null }] },
    } as any);
    render(<MatterPage />);

    expect(await screen.findByText('matter.labels.state-silent')).toBeInTheDocument();
  });

  it('opens the card of the device in the configurator', async () => {
    // The store of the configurator is the real one: the selection it keeps is what
    // makes its page open on this device, and no file of that page is touched for it.
    render(<MatterPage />);

    fireEvent.click(await screen.findByText('Kitchen light'));

    expect(configuratorStore.selection).toEqual({ id: 'module:wb-mr6c_21' });
    expect(navigateMock).toHaveBeenCalledWith('/configurator');
  });

  it('opens a device whose services read another module under its own module', async () => {
    render(<MatterPage />);

    fireEvent.click(await screen.findByText('Boiler'));

    expect(configuratorStore.selection).toEqual({ id: 'module:Boiler' });
  });

  it('goes to the configurator without a selection when there is no module', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({
      ...NOT_PAIRED,
      devices: { ...NOT_PAIRED.devices, list: [{ ...WB_DEVICE, module: null }] },
    } as any);
    render(<MatterPage />);

    fireEvent.click(await screen.findByText('Kitchen light'));

    // Nothing to open: the page lets the configurator choose, instead of selecting a
    // card that does not exist.
    expect(configuratorStore.selection).toEqual(null);
    expect(navigateMock).toHaveBeenCalledWith('/configurator');
  });

  it('says the config has no devices instead of showing an empty table', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({
      ...NOT_PAIRED,
      devices: {
        configured: 0, exposed: 0, skipped: 0, config_error: null, list: [],
      },
    } as any);
    render(<MatterPage />);

    expect(await screen.findByText('matter.labels.devices-empty')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.column-name')).not.toBeInTheDocument();
  });

  it('waits for the menu instead of calling the service missing', async () => {
    // An empty menu means /ui/menu has not answered yet, not that the bridge is absent.
    uiMock.modules = [];
    uiMock.menuItems = [];
    render(<MatterPage />);

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('page-error')).not.toBeInTheDocument());
  });
});
