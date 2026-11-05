// @vitest-environment happy-dom
import { getMatterStatus } from './api';
import MatterStore, { POLL_INTERVAL_MS } from './matter-store';
import type { MatterStatus } from './types';

vi.mock('./api', () => ({ getMatterStatus: vi.fn() }));

const STATUS: MatterStatus = {
  version: '1.0.0',
  paired: false,
  fabrics: [],
  pairing: { manual_code: '23331712339', payload: 'MT:Y.K9042C00KA0648G00', qr_version: 'abcdef12' },
  devices: { configured: 2, exposed: 1, skipped: 0, config_error: null, list: [] },
};

/** happy-dom has no page lifecycle, so visibility is set by hand. */
function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('MatterStore', () => {
  let store: MatterStore;

  beforeEach(() => {
    vi.mocked(getMatterStatus).mockReset();
    vi.mocked(getMatterStatus).mockResolvedValue(STATUS);
    store = new MatterStore();
  });

  afterEach(() => {
    store.stopWatching();
    vi.useRealTimers();
  });

  it('starts out knowing nothing, which is not the same as knowing there is nothing', () => {
    expect(store.status).toBeNull();
    expect(store.isLoading).toBe(true);
    expect(store.isUnreachable).toBe(false);
  });

  it('keeps what the service answered', async () => {
    await store.fetch();

    expect(store.status).toEqual(STATUS);
    expect(store.isLoading).toBe(false);
    expect(store.isUnreachable).toBe(false);
  });

  it('keeps the last answer when the service stops answering', async () => {
    await store.fetch();
    vi.mocked(getMatterStatus).mockRejectedValue(new Error('502'));
    await store.fetch();

    // A page that empties itself on one failed request is worse than one with a warning.
    expect(store.status).toEqual(STATUS);
    expect(store.isUnreachable).toBe(true);
    expect(store.isLoading).toBe(false);
  });

  it('stops waiting even when the first request fails', async () => {
    vi.mocked(getMatterStatus).mockRejectedValue(new Error('502'));
    await store.fetch();

    expect(store.isLoading).toBe(false);
    expect(store.status).toBeNull();
  });

  it('forgets the failure once the service answers again', async () => {
    vi.mocked(getMatterStatus).mockRejectedValue(new Error('502'));
    await store.fetch();
    vi.mocked(getMatterStatus).mockResolvedValue(STATUS);
    await store.fetch();

    expect(store.isUnreachable).toBe(false);
  });

  it('asks at once and then keeps asking', async () => {
    vi.useFakeTimers();
    setVisibility('visible');
    store.startWatching();
    expect(getMatterStatus).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2);

    expect(getMatterStatus).toHaveBeenCalledTimes(3);
  });

  it('does not ask while the tab is hidden', async () => {
    vi.useFakeTimers();
    store.startWatching();
    setVisibility('hidden');
    vi.mocked(getMatterStatus).mockClear();

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);

    expect(getMatterStatus).not.toHaveBeenCalled();
  });

  it('asks the moment the tab comes back', async () => {
    store.startWatching();
    setVisibility('hidden');
    vi.mocked(getMatterStatus).mockClear();

    setVisibility('visible');

    expect(getMatterStatus).toHaveBeenCalledTimes(1);
  });

  it('leaves one timer behind, not two, when started twice', async () => {
    vi.useFakeTimers();
    setVisibility('visible');
    store.startWatching();
    store.startWatching();
    vi.mocked(getMatterStatus).mockClear();

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

    expect(getMatterStatus).toHaveBeenCalledTimes(1);
  });

  it('asks nothing after it is stopped', async () => {
    vi.useFakeTimers();
    setVisibility('visible');
    store.startWatching();
    store.stopWatching();
    vi.mocked(getMatterStatus).mockClear();

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    setVisibility('visible');

    expect(getMatterStatus).not.toHaveBeenCalled();
  });
});
