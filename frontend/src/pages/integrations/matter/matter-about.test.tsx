// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { authStore } from '@/stores/auth';
import { matterStore } from '@/stores/matter';
import { getMatterStatus, resetMatterBridge } from '@/stores/matter/api';
import { cleanup, fireEvent, render, screen, waitFor } from '@/test/render';
import MatterPage from './matter';

const { uiMock } = vi.hoisted(() => ({
  uiMock: { modules: ['matter'], menuItems: [{ id: 'integrations' }] },
}));

vi.mock('@/stores/ui', () => ({ uiStore: uiMock }));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/layouts/page', () => import('@/test/mocks/page-layout'));
// Only the transport is mocked: when the dialog closes and what it says of a failure is
// the store's and the page's own decision.
vi.mock('@/stores/matter/api', async (importOriginal) => ({
  ...await importOriginal() as Record<string, unknown>,
  getMatterStatus: vi.fn(),
  resetMatterBridge: vi.fn(),
}));

const PAIRED = {
  version: '0.0.1',
  bridge: {
    name: 'WB-bridge-TEST',
    matter_version: '1.6.0',
    identity_since: 1_795_000_000_000,
  },
  paired: true,
  fabrics: [{
    index: 1, adminFabricLabel: 'Aqara', vendor_id: 4447, label: { source: 'admin', text: 'Aqara' },
  }],
  pairing: null,
  devices: { configured: 4, exposed: 4, skipped: 0, config_error: null, list: [] },
};
const RESET = { ...PAIRED, paired: false, fabrics: [] };

const theButton = () => screen.getByRole('button', { name: 'matter.buttons.reset' });

describe('MatterPage, the reset of the bridge', () => {
  beforeEach(() => {
    vi.mocked(authStore.hasRights).mockReturnValue(true);
    vi.mocked(getMatterStatus).mockReset();
    vi.mocked(resetMatterBridge).mockReset();
    vi.mocked(resetMatterBridge).mockResolvedValue(undefined);
    runInAction(() => {
      matterStore.status = null;
      matterStore.isLoading = true;
      matterStore.isUnreachable = false;
      matterStore.isResetting = false;
      matterStore.hasResetFailed = false;
    });
  });

  afterEach(() => {
    cleanup();
    matterStore.stopWatching();
  });

  it('has the card about the bridge on the page, with what the bridge said of itself', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED as any);
    render(<MatterPage />);

    expect(await screen.findByText('matter.labels.about')).toBeInTheDocument();
    expect(screen.getByText('WB-bridge-TEST')).toBeInTheDocument();
    expect(screen.getByText('1.6.0')).toBeInTheDocument();
  });

  it('asks before the reset and says what it costs: nothing is sent on the first press', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED as any);
    render(<MatterPage />);
    await screen.findByText('matter.labels.about');

    fireEvent.click(theButton());

    expect(await screen.findByText('matter.labels.reset-heading')).toBeInTheDocument();
    for (const line of ['reset-fabrics', 'reset-apps', 'reset-ids', 'reset-keeps']) {
      expect(screen.getByText(`matter.labels.${line}`)).toBeInTheDocument();
    }
    expect(resetMatterBridge).not.toHaveBeenCalled();
  });

  it('says of a bridge with no fabrics that it has none, and not "0 will be removed"', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(RESET as any);
    render(<MatterPage />);
    await screen.findByText('matter.labels.about');

    fireEvent.click(theButton());

    expect(await screen.findByText('matter.labels.reset-no-fabrics')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.reset-fabrics')).not.toBeInTheDocument();
    // And nothing about the apps losing the bridge: there is none to lose it.
    expect(screen.queryByText('matter.labels.reset-apps')).not.toBeInTheDocument();
    expect(screen.getByText('matter.labels.reset-ids')).toBeInTheDocument();
  });

  it('resets on the second press, closes the dialog and shows the bridge as it is after', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED as any);
    render(<MatterPage />);
    await screen.findByText('Aqara');
    fireEvent.click(theButton());
    await screen.findByText('matter.labels.reset-heading');

    vi.mocked(getMatterStatus).mockResolvedValue(RESET as any);
    fireEvent.click(screen.getByText('matter.buttons.reset-confirm'));

    await waitFor(() => expect(resetMatterBridge).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('matter.labels.reset-heading')).not.toBeInTheDocument());
    expect(screen.queryByText('Aqara')).not.toBeInTheDocument();
  });

  it('keeps the dialog open and says so when the reset did not go through', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED as any);
    vi.mocked(resetMatterBridge).mockRejectedValue(new Error('409'));
    render(<MatterPage />);
    await screen.findByText('Aqara');
    fireEvent.click(theButton());
    await screen.findByText('matter.labels.reset-heading');

    fireEvent.click(screen.getByText('matter.buttons.reset-confirm'));

    expect(await screen.findByText('matter.labels.reset-failed')).toBeInTheDocument();
    expect(screen.getByText('matter.labels.reset-heading')).toBeInTheDocument();
    expect(screen.getByText('Aqara')).toBeInTheDocument();
  });
});
