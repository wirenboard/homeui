// @vitest-environment happy-dom
import { getMatterStatus } from './api';
import MatterStore from './matter-store';
import type { MatterStatus } from './types';

vi.mock('./api', () => ({ getMatterStatus: vi.fn() }));

const NOW = 1_800_000_000_000;
const MINUTE = 60 * 1000;

const DEVICES = { configured: 2, exposed: 2, skipped: 0, config_error: null, list: [] };

const status = (extra: Partial<MatterStatus> = {}): MatterStatus => ({
  version: '1.0.0',
  now: NOW,
  paired: false,
  fabrics: [],
  pairing: null,
  devices: DEVICES,
  ...extra,
} as MatterStatus);

const OPEN = {
  closes_at: NOW + 15 * MINUTE, manual_code: '23331712339', payload: 'MT:Y.K9042C00KA0648G00', qr_version: 'abcdef12',
};

/** happy-dom has no page lifecycle, so visibility is set by hand. */
function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

/**
 * The pairing code is a credential: the store keeps it while the bridge says the block is
 * open, and no longer - not for the next visitor of the page, and not past its time for a
 * bridge that stopped answering.
 */
describe('MatterStore, how long the pairing code is kept', () => {
  let store: MatterStore;

  /** One poll of the bridge, answered with the given state. */
  const poll = async (answer: MatterStatus) => {
    vi.mocked(getMatterStatus).mockResolvedValueOnce(answer);
    await store.fetch();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.mocked(getMatterStatus).mockReset();
    store = new MatterStore();
  });

  afterEach(() => {
    store.stopWatching();
    vi.useRealTimers();
  });

  it('drops the code when the page is left, and keeps the rest of the state', async () => {
    await poll(status({ pairing: OPEN }));
    expect(store.status.pairing).toEqual(OPEN);

    store.stopWatching();

    expect(store.status.pairing).toBeNull();
    expect(store.status.devices).toEqual(DEVICES);
  });

  it('does not take the code from an answer that comes after the page was left', async () => {
    let answer: (_status: MatterStatus) => void = () => {};
    vi.mocked(getMatterStatus).mockReturnValue(new Promise<MatterStatus>((resolve) => {
      answer = resolve;
    }));
    const asked = store.fetch();

    store.stopWatching();
    answer(status({ pairing: OPEN }));
    await asked;

    expect(store.status).toBeNull();
  });

  it('keeps the code of a bridge that went quiet while its time runs, and drops it once the time is over', async () => {
    await poll(status({ pairing: OPEN }));
    vi.mocked(getMatterStatus).mockRejectedValue(new Error('502'));

    vi.setSystemTime(NOW + MINUTE);
    await store.fetch();
    expect(store.isUnreachable).toBe(true);
    expect(store.status.pairing).toEqual(OPEN);

    vi.setSystemTime(NOW + 15 * MINUTE + 1000);
    await store.fetch();
    expect(store.status.pairing).toBeNull();
    // Only the code goes: the page with a warning over the data is still the page.
    expect(store.status.devices).toEqual(DEVICES);
  });

  it('goes by the clock of the controller when it decides the time is over', async () => {
    // The controller is five hours ahead of the browser: its block ends in a minute.
    const far = NOW + 5 * 60 * MINUTE;
    await poll(status({ now: far, pairing: { ...OPEN, closes_at: far + MINUTE } }));
    vi.mocked(getMatterStatus).mockRejectedValue(new Error('502'));

    vi.setSystemTime(NOW + 2 * MINUTE);
    await store.fetch();

    expect(store.status.pairing).toBeNull();
  });

  it('still says the time ran out when the bridge comes back after a code dropped that way', async () => {
    await poll(status({ pairing: OPEN }));
    vi.mocked(getMatterStatus).mockRejectedValue(new Error('502'));
    vi.setSystemTime(NOW + 15 * MINUTE + 1000);
    await store.fetch();
    expect(store.status.pairing).toBeNull();

    vi.setSystemTime(NOW + 16 * MINUTE);
    await poll(status({ now: NOW + 16 * MINUTE }));

    expect(store.hasWindowExpired).toBe(true);
  });

  it('drops a code whose time ran out the moment the tab comes back, before the bridge answers', async () => {
    setVisibility('visible');
    vi.mocked(getMatterStatus).mockResolvedValue(status({ pairing: OPEN }));
    store.startWatching();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.status.pairing).toEqual(OPEN);

    setVisibility('hidden');
    vi.setSystemTime(NOW + 16 * MINUTE);
    // The bridge is slow to answer: the old state is all the page has meanwhile.
    vi.mocked(getMatterStatus).mockReturnValue(new Promise<MatterStatus>(() => {}));
    setVisibility('visible');

    expect(store.status.pairing).toBeNull();
  });
});
