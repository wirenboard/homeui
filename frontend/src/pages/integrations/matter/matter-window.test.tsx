// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { authStore } from '@/stores/auth';
import { matterStore } from '@/stores/matter';
import { closeMatterWindow, getMatterStatus, openMatterWindow } from '@/stores/matter/api';
import { render, screen, fireEvent, waitFor } from '@/test/render';
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
  openMatterWindow: vi.fn(),
  closeMatterWindow: vi.fn(),
}));
vi.mock('@/assets/icons/copy.svg', () => ({ default: () => null }));

const OPEN = {
  version: '1.0.0',
  paired: false,
  fabrics: [],
  pairing: {
    closes_at: Date.now() + 15 * 60 * 1000,
    manual_code: '23331712339',
    payload: 'MT:Y.K9042C00KA0648G00',
    qr_version: 'abcdef12',
  },
  devices: { configured: 0, exposed: 0, skipped: 0, config_error: null, list: [] },
};

const CLOSED = { ...OPEN, pairing: null };

/**
 * The window is the only way the bridge becomes pairable: it comes up closed and stays
 * closed until somebody with the admin role presses the button here. See R15 in
 * docs/design-config-and-pairing.md of wb-mqtt-matter-bridge.
 */
describe('MatterPage, the pairing window', () => {
  beforeEach(() => {
    vi.mocked(authStore.hasRights).mockReturnValue(true);
    vi.mocked(getMatterStatus).mockReset();
    vi.mocked(getMatterStatus).mockResolvedValue(OPEN as any);
    vi.mocked(openMatterWindow).mockReset();
    vi.mocked(openMatterWindow).mockResolvedValue({ ok: true, closes_at: Date.now() + 1000 });
    vi.mocked(closeMatterWindow).mockReset();
    vi.mocked(closeMatterWindow).mockResolvedValue({ ok: true, closes_at: null });
    uiMock.modules = ['matter'];
    uiMock.menuItems = [{ id: 'integrations' }];
    runInAction(() => {
      matterStore.status = null;
      matterStore.isLoading = true;
      matterStore.isUnreachable = false;
      matterStore.isChangingWindow = false;
      matterStore.hasWindowFailed = false;
    });
  });

  afterEach(() => {
    matterStore.stopWatching();
  });

  it('offers to open a window, and shows no code, while the window is closed', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(CLOSED as any);
    render(<MatterPage />);

    expect(await screen.findByText('matter.buttons.open-window')).toBeInTheDocument();
    expect(screen.getByText('matter.labels.window-closed')).toBeInTheDocument();
    expect(screen.queryByAltText('matter.labels.qr-alt')).not.toBeInTheDocument();
    expect(screen.queryByText('2333-171-2339')).not.toBeInTheDocument();
  });

  it('asks the service for a window when the button is pressed', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(CLOSED as any);
    render(<MatterPage />);

    fireEvent.click(await screen.findByText('matter.buttons.open-window'));

    await waitFor(() => expect(openMatterWindow).toHaveBeenCalledTimes(1));
  });

  it('says so when the window could not be opened, which is what a 409 means', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(CLOSED as any);
    vi.mocked(openMatterWindow).mockRejectedValue(new Error('409'));
    render(<MatterPage />);

    fireEvent.click(await screen.findByText('matter.buttons.open-window'));

    expect(await screen.findByText('matter.labels.window-failed')).toBeInTheDocument();
  });

  it('counts an open window down and lets it be closed early', async () => {
    render(<MatterPage />);
    expect(await screen.findByText('matter.labels.window-left')).toBeInTheDocument();

    fireEvent.click(screen.getByText('matter.buttons.close-window'));

    await waitFor(() => expect(closeMatterWindow).toHaveBeenCalledTimes(1));
  });
});
