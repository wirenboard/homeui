// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { authStore } from '@/stores/auth';
import { matterStore } from '@/stores/matter';
import {
  changeMatterCode, getMatterStatus, openMatterWindow, unpairFabric,
} from '@/stores/matter/api';
import { act, cleanup, render, screen, fireEvent, waitFor } from '@/test/render';
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
  unpairFabric: vi.fn(),
  openMatterWindow: vi.fn(),
  changeMatterCode: vi.fn(),
}));
vi.mock('@/assets/icons/copy.svg', () => ({ default: () => null }));

const fabric = (index: number, text: string) => ({
  index, adminFabricLabel: text, vendor_id: 4660, label: { source: 'admin', text },
});

const CLOSED = {
  version: '1.0.0',
  paired: true,
  fabrics: [fabric(1, 'First'), fabric(2, 'Second')],
  pairing: null,
  devices: { configured: 0, exposed: 0, skipped: 0, config_error: null, list: [] },
};

const OPEN = {
  ...CLOSED,
  pairing: {
    closes_at: Date.now() + 15 * 60 * 1000,
    manual_code: '23331712339',
    payload: 'MT:Y.K9042C00KA0648G00',
    qr_version: 'abcdef12',
  },
};

/** Opens the unpair dialog of the fabric that stands at the given place in the list. */
const askToUnpair = async (place: number) => {
  fireEvent.click((await screen.findAllByLabelText('matter.buttons.fabric-actions'))[place]);
  fireEvent.click(screen.getByText('matter.buttons.unpair'));
  await screen.findByText('matter.labels.unpair-heading');
};

/**
 * What must not outlive its place on the page: the pairing code, which is a credential,
 * and the word of a failure, which belongs to the attempt and the fabric it was said of.
 */
describe('MatterPage, what is not carried over', () => {
  beforeEach(() => {
    // The menu of a row is drawn through a portal into the root the app shell provides.
    const floatingRoot = document.createElement('div');
    floatingRoot.className = 'floating';
    document.body.append(floatingRoot);

    vi.mocked(authStore.hasRights).mockReturnValue(true);
    vi.mocked(getMatterStatus).mockReset();
    vi.mocked(getMatterStatus).mockResolvedValue(CLOSED as any);
    vi.mocked(unpairFabric).mockReset();
    vi.mocked(unpairFabric).mockRejectedValue(new Error('409'));
    vi.mocked(openMatterWindow).mockReset();
    vi.mocked(openMatterWindow).mockRejectedValue(new Error('409'));
    vi.mocked(changeMatterCode).mockReset();
    vi.mocked(changeMatterCode).mockRejectedValue(new Error('409'));
    runInAction(() => {
      matterStore.status = null;
      matterStore.isLoading = true;
      matterStore.isUnreachable = false;
      matterStore.unpairingIndex = null;
      matterStore.hasUnpairFailed = false;
      matterStore.isChangingWindow = false;
      matterStore.hasWindowFailed = false;
      matterStore.hasCodeFailed = false;
    });
  });

  afterEach(() => {
    // The page goes first, as it does in the browser: stopping the store drops the
    // pairing code, and a page still mounted would be drawn again outside act.
    cleanup();
    matterStore.stopWatching();
  });

  it('takes the code off the screen when the bridge stops answering', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(OPEN as any);
    render(<MatterPage />);
    expect(await screen.findByText('2333-171-2339')).toBeInTheDocument();

    // Of a bridge that is silent the page knows the last state only, and whether the
    // block is still open is not a thing to guess with a credential.
    vi.mocked(getMatterStatus).mockRejectedValue(new Error('502'));
    await act(() => matterStore.fetch());

    expect(screen.queryByText('2333-171-2339')).not.toBeInTheDocument();
    expect(screen.queryByAltText('matter.labels.qr-alt')).not.toBeInTheDocument();
    expect(screen.getByText('matter.labels.window-offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'matter.buttons.open-window' })).toBeDisabled();
    // The rest of the last known state stays under the warning.
    expect(screen.getByText('First')).toBeInTheDocument();
  });

  it('does not show the code again to whoever opens the page after it was left', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(OPEN as any);
    const page = render(<MatterPage />);
    expect(await screen.findByText('2333-171-2339')).toBeInTheDocument();
    page.unmount();

    // The bridge has not answered the new page yet: nothing of the old block is drawn.
    vi.mocked(getMatterStatus).mockReturnValue(new Promise(() => {}));
    render(<MatterPage />);

    expect(await screen.findByText('First')).toBeInTheDocument();
    expect(screen.queryByText('2333-171-2339')).not.toBeInTheDocument();
    expect(screen.queryByText('matter.labels.window-expired')).not.toBeInTheDocument();
  });

  it('says of a failed unpairing in the dialog of that fabric, and not in the one opened next', async () => {
    render(<MatterPage />);
    await askToUnpair(0);
    fireEvent.click(screen.getByText('matter.buttons.unpair-here'));
    expect(await screen.findByText('matter.labels.unpair-failed')).toBeInTheDocument();

    fireEvent.click(screen.getByText('matter.buttons.unpair-close'));
    await waitFor(() => expect(screen.queryByText('matter.labels.unpair-heading')).not.toBeInTheDocument());
    await askToUnpair(1);

    expect(screen.queryByText('matter.labels.unpair-failed')).not.toBeInTheDocument();
  });

  it('says a code that was not changed in its dialog, not under the button that adds a fabric', async () => {
    render(<MatterPage />);
    fireEvent.click(await screen.findByText('matter.buttons.new-code'));
    fireEvent.click(await screen.findByText('matter.buttons.new-code-confirm'));

    expect(await screen.findByText('matter.labels.new-code-failed')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.window-failed')).not.toBeInTheDocument();

    // And the dialog opened again starts clean.
    fireEvent.click(screen.getByText('matter.buttons.new-code-cancel'));
    await waitFor(() => expect(screen.queryByText('matter.labels.new-code-cost')).not.toBeInTheDocument());
    fireEvent.click(screen.getByText('matter.buttons.new-code'));
    expect(await screen.findByText('matter.labels.new-code-cost')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.new-code-failed')).not.toBeInTheDocument();
  });

  it('does not say the code was not changed when it was the adding of a fabric that failed', async () => {
    render(<MatterPage />);
    fireEvent.click(await screen.findByText('matter.buttons.open-window'));
    expect(await screen.findByText('matter.labels.window-failed')).toBeInTheDocument();

    fireEvent.click(screen.getByText('matter.buttons.new-code'));

    expect(await screen.findByText('matter.labels.new-code-cost')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.new-code-failed')).not.toBeInTheDocument();
  });
});
