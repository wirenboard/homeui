// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';
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
  fabrics: [{ index: 1, adminFabricLabel: 'Yandex', vendor_id: 4660, online: true }],
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

/** Whether the first element comes before the second on the page. */
const isAbove = (first: Element, second: Element) => (
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)
);

/**
 * The fabrics that are paired and the way to pair the next one are one card: they used to
 * be two, and it was not plain why, or which of the two to look at first.
 */
describe('MatterPage, fabrics and the pairing window in one card', () => {
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
    });
  });

  afterEach(() => {
    matterStore.stopWatching();
  });

  it('says nothing is paired and invites to pair in the same card, the invitation last', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(EMPTY as any);
    render(<MatterPage />);

    const invitation = await screen.findByText('matter.labels.window-closed');
    const nothing = screen.getByText('matter.labels.fabrics-empty');
    expect(cardOf(invitation)).toBe(fabricsCard());
    expect(cardOf(nothing)).toBe(fabricsCard());
    expect(isAbove(nothing, invitation)).toBe(true);
    expect(cardOf(screen.getByText('matter.buttons.open-window'))).toBe(fabricsCard());
  });

  it('puts the button that opens a window under the fabrics that are paired', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED as any);
    render(<MatterPage />);

    const fabric = await screen.findByText('Yandex');
    const button = screen.getByText('matter.buttons.open-window');
    expect(cardOf(button)).toBe(fabricsCard());
    expect(isAbove(fabric, button)).toBe(true);
    expect(screen.getByText('matter.labels.window-closed-paired')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.fabrics-empty')).not.toBeInTheDocument();
  });

  it('shows the code of an open window under the fabrics, where the new one will appear', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED_AND_OPEN as any);
    render(<MatterPage />);

    const fabric = await screen.findByText('Yandex');
    const picture = screen.getByAltText('matter.labels.qr-alt');
    expect(cardOf(picture)).toBe(fabricsCard());
    expect(isAbove(fabric, picture)).toBe(true);
    expect(cardOf(screen.getByText('matter.labels.window-left'))).toBe(fabricsCard());
  });

  it('still says nothing is paired while the first window is open', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue({ ...PAIRED_AND_OPEN, paired: false, fabrics: [] } as any);
    render(<MatterPage />);

    const picture = await screen.findByAltText('matter.labels.qr-alt');
    expect(isAbove(screen.getByText('matter.labels.fabrics-empty'), picture)).toBe(true);
  });

  it('has no card of its own for pairing any more', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(PAIRED as any);
    render(<MatterPage />);

    await screen.findByText('Yandex');
    const headings = [...document.querySelectorAll('.card-title')].map((heading) => heading.textContent);
    expect(headings).toEqual(['matter.labels.fabrics', 'matter.labels.devices']);
  });

  it('has the words in both languages, and they name how long a window lasts', () => {
    for (const labels of [ru.matter.labels, en.matter.labels]) {
      expect(labels['window-closed']).toMatch(/15/);
      expect(labels['window-closed-paired']).toMatch(/15/);
      expect(labels['window-left']).toMatch(/\{\{left\}\}/);
      // The hint under the list pointed at "the button above", which is now below.
      expect(labels['fabrics-hint']).not.toMatch(/выше|above/);
    }
  });
});
