// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';
import { authStore } from '@/stores/auth';
import { matterStore } from '@/stores/matter';
import { getMatterStatus } from '@/stores/matter/api';
import { cleanup, render, screen } from '@/test/render';
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
vi.mock('@/utils/clipboard', () => ({ copyToClipboard: vi.fn() }));

const EMPTY = {
  version: '1.0.0',
  paired: false,
  fabrics: [],
  pairing: null,
  devices: { configured: 0, exposed: 0, skipped: 0, config_error: null, list: [] },
};

const PAIRED = {
  ...EMPTY,
  paired: true,
  fabrics: [{
    index: 1, adminFabricLabel: 'Yandex', vendor_id: 4660, online: true, label: { source: 'admin', text: 'Yandex' },
  }],
};

const PAIRED_AND_OPEN = {
  ...PAIRED,
  pairing: {
    closes_at: Date.now() + 15 * 60 * 1000,
    manual_code: '23331712339',
    payload: 'MT:Y.K9042C00KA0648G00',
    qr_version: 'abcdef12',
  },
};

/** The card an element of the page is drawn in. */
const cardOf = (element: Element) => element.closest('.card');

const fabricsCard = () => cardOf(screen.getByText('matter.labels.fabrics'));
const settingsCard = () => cardOf(screen.getByText('matter.labels.settings'));

/** Whether the first element comes before the second on the page. */
const isAbove = (first: Element, second: Element) => (
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)
);

/**
 * The fabrics that are paired and the way to add the next one are one card, and the button,
 * the code and the way to call it off share one place in it: under the list, where the new
 * fabric will appear. They used to be two cards, and it was not plain which to look at.
 */
describe('MatterPage, fabrics and the way to add one in one card', () => {
  beforeEach(() => {
    vi.mocked(authStore.hasRights).mockReturnValue(true);
    vi.mocked(getMatterStatus).mockReset();
    uiMock.modules = ['matter'];
    uiMock.menuItems = [{ id: 'integrations' }];
    runInAction(() => {
      matterStore.status = null;
      matterStore.isLoading = true;
      matterStore.isUnreachable = false;
      matterStore.isChangingWindow = false;
      matterStore.hasWindowFailed = false;
      matterStore.hasWindowExpired = false;
    });
  });

  afterEach(() => {
    // The page goes first, as it does in the browser: stopping the store drops the
    // pairing code, and a page still mounted would be drawn again outside act.
    cleanup();
    matterStore.stopWatching();
  });

  it('invites an empty bridge to its first app in the card of fabrics, and says so once', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(EMPTY as any);
    render(<MatterPage />);

    const invitation = await screen.findByText('matter.labels.fabrics-empty');
    expect(cardOf(invitation)).toBe(fabricsCard());
    // Once: the invitation is all an empty list has to say, and it used to be said twice.
    expect(screen.getAllByText('matter.labels.fabrics-empty')).toHaveLength(1);
    expect(cardOf(screen.getByText('matter.labels.window-closed'))).toBe(fabricsCard());
    expect(cardOf(screen.getByText('matter.buttons.open-window'))).toBe(fabricsCard());
  });

  it('warns the first app will get nothing only while the bridge gives no device away', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(EMPTY as any);
    const { unmount } = render(<MatterPage />);
    expect(await screen.findByText('matter.labels.window-no-devices')).toBeInTheDocument();
    unmount();
    matterStore.stopWatching();

    vi.mocked(getMatterStatus).mockResolvedValue({
      ...EMPTY, devices: { ...EMPTY.devices, configured: 3, exposed: 3 },
    } as any);
    runInAction(() => {
      matterStore.status = null;
      matterStore.isLoading = true;
    });
    render(<MatterPage />);
    await screen.findByText('matter.labels.fabrics-empty');
    expect(screen.queryByText('matter.labels.window-no-devices')).not.toBeInTheDocument();
  });

  it('puts the button that adds a fabric under the fabrics that are paired', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED as any);
    render(<MatterPage />);

    const fabric = await screen.findByText('Yandex');
    const button = screen.getByText('matter.buttons.open-window');
    expect(cardOf(button)).toBe(fabricsCard());
    expect(isAbove(fabric, button)).toBe(true);
    expect(screen.getByText('matter.labels.window-closed-paired')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.fabrics-empty')).not.toBeInTheDocument();
  });

  it('shows the code where the button stood: under the fabrics, where the new one will appear', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED_AND_OPEN as any);
    render(<MatterPage />);

    const fabric = await screen.findByText('Yandex');
    const picture = screen.getByAltText('matter.labels.qr-alt');
    expect(cardOf(picture)).toBe(fabricsCard());
    expect(isAbove(fabric, picture)).toBe(true);
    expect(cardOf(screen.getByText('matter.labels.window-left'))).toBe(fabricsCard());
    expect(cardOf(screen.getByText('matter.buttons.close-window'))).toBe(fabricsCard());
    expect(screen.queryByText('matter.buttons.open-window')).not.toBeInTheDocument();
  });

  it('shows the wait alone while the first fabric is being added: no invitation beside the code', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({ ...PAIRED_AND_OPEN, paired: false, fabrics: [] } as any);
    render(<MatterPage />);

    const picture = await screen.findByAltText('matter.labels.qr-alt');
    expect(cardOf(picture)).toBe(fabricsCard());
    expect(screen.getByText('matter.labels.window-left')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.fabrics-empty')).not.toBeInTheDocument();
  });

  it('draws no coloured block inside the card of fabrics, whatever the bridge is doing', async () => {
    for (const state of [EMPTY, PAIRED, PAIRED_AND_OPEN]) {
      vi.mocked(getMatterStatus).mockResolvedValue(state as any);
      runInAction(() => {
        matterStore.status = null;
        matterStore.isLoading = true;
      });
      const { unmount } = render(<MatterPage />);
      await screen.findByText('matter.labels.fabrics');
      expect(fabricsCard().querySelector('.alertMessage')).toBeNull();
      unmount();
      matterStore.stopWatching();
    }
  });

  it('keeps the change of the code in the settings, away from the button that adds', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED as any);
    render(<MatterPage />);

    await screen.findByText('Yandex');
    expect(cardOf(screen.getByText('matter.buttons.new-code'))).toBe(settingsCard());
    expect(screen.getByText('matter.labels.pairing-code-hint')).toBeInTheDocument();
  });

  it('says in the settings why the code cannot be changed while a fabric is being added', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED_AND_OPEN as any);
    render(<MatterPage />);

    await screen.findByText('Yandex');
    expect(screen.queryByText('matter.buttons.new-code')).not.toBeInTheDocument();
    expect(cardOf(screen.getByText('matter.labels.pairing-code-busy'))).toBe(settingsCard());
  });

  it('locks the button and points at the top of the page when Matter has not started', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({
      ...PAIRED, network_error: { code: 'no_ipv6', reason: 'no IPv6 address' },
    } as any);
    render(<MatterPage />);

    await screen.findByText('Yandex');
    expect(screen.getByRole('button', { name: 'matter.buttons.open-window' })).toBeDisabled();
    expect(screen.getByText('matter.labels.window-offline')).toBeInTheDocument();
  });

  it('has four cards, the bridge itself last, and none of its own for pairing', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED as any);
    render(<MatterPage />);

    await screen.findByText('Yandex');
    const headings = [...document.querySelectorAll('.card-title')].map((heading) => heading.textContent);
    expect(headings).toEqual([
      'matter.labels.fabrics', 'matter.labels.devices', 'matter.labels.settings', 'matter.labels.about',
    ]);
  });

  it('has the words in both languages: the button names the goal and nothing speaks of a window', () => {
    for (const { labels, buttons } of [ru.matter, en.matter]) {
      expect(buttons['open-window']).toMatch(/фабрик|fabric/);
      expect(labels['window-closed']).toMatch(/\{\{count\}\}/);
      expect(labels['window-left']).toMatch(/\{\{left\}\}/);
      expect(labels['window-expired']).toMatch(/15/);
      for (const text of [...Object.values(labels), ...Object.values(buttons)]) {
        expect(text).not.toMatch(/окн|window/i);
        // No one ecosystem is singled out by name beside the others that fit as well.
        expect(text).not.toMatch(/алис|alice/i);
      }
    }
  });
});
