// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { authStore } from '@/stores/auth';
import { matterStore } from '@/stores/matter';
import { getMatterStatus, setMatterSettings } from '@/stores/matter/api';
import { render, screen, fireEvent, waitFor } from '@/test/render';
import MatterPage from './matter';

const { uiMock } = vi.hoisted(() => ({
  uiMock: { modules: ['matter'], menuItems: [{ id: 'integrations' }] },
}));

vi.mock('@/stores/ui', () => ({ uiStore: uiMock }));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/layouts/page', () => import('@/test/mocks/page-layout'));
// Only the transport is mocked: whether the switch shows the click or the bridge is the
// store's decision, and that decision is what these tests are about.
vi.mock('@/stores/matter/api', async (importOriginal) => ({
  ...await importOriginal() as Record<string, unknown>,
  getMatterStatus: vi.fn(),
  setMatterSettings: vi.fn(),
}));

const PAIRED = {
  version: '1.0.0',
  paired: true,
  fabrics: [{ index: 1, adminFabricLabel: 'Aqara', vendor_id: 4447 }],
  pairing: null,
  devices: { configured: 0, exposed: 0, skipped: 0, config_error: null, list: [] },
};

const theSwitch = () => screen.getByRole('checkbox') as HTMLInputElement;

describe('MatterPage, the settings', () => {
  beforeEach(() => {
    vi.mocked(authStore.hasRights).mockReturnValue(true);
    vi.mocked(getMatterStatus).mockReset();
    vi.mocked(setMatterSettings).mockReset();
    vi.mocked(setMatterSettings).mockResolvedValue(undefined);
    runInAction(() => {
      matterStore.status = null;
      matterStore.isLoading = true;
      matterStore.isUnreachable = false;
      matterStore.isSavingSettings = false;
      matterStore.hasSettingsFailed = false;
    });
  });

  afterEach(() => {
    matterStore.stopWatching();
  });

  it('has no switch for a bridge that sends no settings, only the line about the code', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED as any);
    render(<MatterPage />);

    await screen.findByText('Aqara');
    expect(screen.getByText('matter.labels.settings')).toBeInTheDocument();
    expect(screen.getByText('matter.labels.pairing-code')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows the switch as the bridge holds it, sends a click to the bridge and shows what comes back', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({ ...PAIRED, settings: { name_in_model: true } } as any);
    render(<MatterPage />);

    await screen.findByText('matter.labels.settings');
    expect(theSwitch().checked).toBe(true);

    vi.mocked(getMatterStatus).mockResolvedValue({ ...PAIRED, settings: { name_in_model: false } } as any);
    fireEvent.click(theSwitch());

    await waitFor(() => expect(setMatterSettings).toHaveBeenCalledWith({ name_in_model: false }));
    await waitFor(() => expect(theSwitch().checked).toBe(false));
    await waitFor(() => expect(theSwitch().disabled).toBe(false));
    expect(screen.queryByText('matter.labels.settings-failed')).not.toBeInTheDocument();
  });

  it('says the setting was not saved and leaves the switch where the bridge has it', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({ ...PAIRED, settings: { name_in_model: true } } as any);
    vi.mocked(setMatterSettings).mockRejectedValue(new Error('500'));
    render(<MatterPage />);

    await screen.findByText('matter.labels.settings');
    fireEvent.click(theSwitch());

    expect(await screen.findByText('matter.labels.settings-failed')).toBeInTheDocument();
    expect(theSwitch().checked).toBe(true);
    await waitFor(() => expect(theSwitch().disabled).toBe(false));
  });
});
