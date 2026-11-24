// @vitest-environment happy-dom
import { closeMatterWindow, getMatterStatus, openMatterWindow } from './api';
import MatterStore from './matter-store';
import type { MatterStatus } from './types';

vi.mock('./api', () => ({
  getMatterStatus: vi.fn(),
  openMatterWindow: vi.fn(),
  closeMatterWindow: vi.fn(),
}));

const NOW = 1_800_000_000_000;
const MINUTE = 60 * 1000;

const FABRIC = { index: 1, adminFabricLabel: 'Yandex', vendor_id: 4660 };

const status = (extra: Partial<MatterStatus> = {}): MatterStatus => ({
  version: '1.0.0',
  now: NOW,
  paired: false,
  fabrics: [],
  pairing: null,
  devices: { configured: 0, exposed: 0, skipped: 0, config_error: null, list: [] },
  ...extra,
} as MatterStatus);

const open = (closesAt: number) => ({
  closes_at: closesAt, manual_code: '23331712339', payload: 'MT:Y.K9042C00KA0648G00', qr_version: 'abcdef12',
});

/**
 * The page has to tell a window that ran out from one that ended for a reason: the first
 * leaves a person with a code that vanished, the second with a new fabric or their own click.
 */
describe('MatterStore, how a pairing window ended', () => {
  let store: MatterStore;

  /** One poll of the bridge, answered with the given state. */
  const poll = async (answer: MatterStatus) => {
    vi.mocked(getMatterStatus).mockResolvedValueOnce(answer);
    await store.fetch();
  };

  beforeEach(() => {
    vi.mocked(getMatterStatus).mockReset();
    vi.mocked(openMatterWindow).mockReset();
    vi.mocked(closeMatterWindow).mockReset();
    store = new MatterStore();
  });

  it('says nothing ran out before any window was seen', async () => {
    await poll(status());
    await poll(status({ now: NOW + MINUTE }));

    expect(store.hasWindowExpired).toBe(false);
  });

  it('says the window ran out when it is gone at its time with nobody added', async () => {
    await poll(status({ pairing: open(NOW + 15 * MINUTE) }));
    expect(store.hasWindowExpired).toBe(false);

    await poll(status({ now: NOW + 15 * MINUTE + 3000 }));
    expect(store.hasWindowExpired).toBe(true);
  });

  it('goes by the clock of the controller, which may be hours away from the browser', async () => {
    const far = NOW + 5 * 60 * MINUTE;
    await poll(status({ now: far, pairing: open(far + 15 * MINUTE) }));
    await poll(status({ now: far + 15 * MINUTE + 3000 }));

    expect(store.hasWindowExpired).toBe(true);
  });

  it('does not call it run out when a fabric was added', async () => {
    await poll(status({ pairing: open(NOW + 15 * MINUTE) }));
    await poll(status({ now: NOW + 15 * MINUTE + 3000, paired: true, fabrics: [FABRIC] as any }));

    expect(store.hasWindowExpired).toBe(false);
  });

  it('does not call it run out when it was closed before its time', async () => {
    vi.mocked(closeMatterWindow).mockResolvedValue({ ok: true, closes_at: null });
    await poll(status({ pairing: open(NOW + 15 * MINUTE) }));

    vi.mocked(getMatterStatus).mockResolvedValueOnce(status({ now: NOW + 2 * MINUTE }));
    await store.closeWindow();

    expect(store.hasWindowExpired).toBe(false);
  });

  it('keeps saying so over the polls that follow, until the next window opens', async () => {
    await poll(status({ pairing: open(NOW + 15 * MINUTE) }));
    await poll(status({ now: NOW + 15 * MINUTE + 3000 }));
    await poll(status({ now: NOW + 16 * MINUTE }));
    expect(store.hasWindowExpired).toBe(true);

    vi.mocked(openMatterWindow).mockResolvedValue({ ok: true, closes_at: NOW + 32 * MINUTE });
    vi.mocked(getMatterStatus).mockResolvedValueOnce(
      status({ now: NOW + 17 * MINUTE, pairing: open(NOW + 32 * MINUTE) }),
    );
    await store.openWindow();
    expect(store.hasWindowExpired).toBe(false);
  });

  it('forgets it when the page is opened anew', async () => {
    await poll(status({ pairing: open(NOW + 15 * MINUTE) }));
    await poll(status({ now: NOW + 15 * MINUTE + 3000 }));
    expect(store.hasWindowExpired).toBe(true);

    vi.mocked(getMatterStatus).mockResolvedValue(status({ now: NOW + 60 * MINUTE }));
    store.startWatching();
    store.stopWatching();
    expect(store.hasWindowExpired).toBe(false);
  });

  it('takes the word back when the fabric shows up a poll after the window went', async () => {
    await poll(status({ pairing: open(NOW + 15 * MINUTE) }));
    await poll(status({ now: NOW + 15 * MINUTE + 3000 }));
    expect(store.hasWindowExpired).toBe(true);

    await poll(status({ now: NOW + 15 * MINUTE + 8000, paired: true, fabrics: [FABRIC] as any }));
    expect(store.hasWindowExpired).toBe(false);
  });
});
