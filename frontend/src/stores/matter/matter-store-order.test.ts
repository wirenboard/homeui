// @vitest-environment happy-dom
import { getMatterStatus, setMatterSettings } from './api';
import MatterStore from './matter-store';
import type { MatterStatus } from './types';

vi.mock('./api', () => ({
  getMatterStatus: vi.fn(),
  setMatterSettings: vi.fn(),
}));

const status = (nameInModel: boolean, extra: Partial<MatterStatus> = {}): MatterStatus => ({
  version: '1.0.0',
  paired: false,
  fabrics: [],
  pairing: null,
  devices: { configured: 0, exposed: 0, skipped: 0, config_error: null, list: [] },
  settings: { name_in_model: nameInModel },
  ...extra,
});

/** A request whose answer the test gives when it chooses to. */
const pending = <T>() => {
  let give: (value: T) => void = () => {};
  let refuse: (reason: Error) => void = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    give = resolve;
    refuse = reject;
  });
  return { promise, give, refuse };
};

describe('MatterStore, answers that come back out of order', () => {
  let store: MatterStore;

  beforeEach(() => {
    vi.mocked(getMatterStatus).mockReset();
    vi.mocked(setMatterSettings).mockReset();
    vi.mocked(setMatterSettings).mockResolvedValue(undefined);
    store = new MatterStore();
  });

  it('keeps the state read after a change when a poll sent before it is answered later', async () => {
    const poll = pending<MatterStatus>();
    vi.mocked(getMatterStatus).mockReturnValueOnce(poll.promise);
    const polling = store.fetch();

    vi.mocked(getMatterStatus).mockResolvedValueOnce(status(false));
    await store.setSettings({ name_in_model: false });
    expect(store.status?.settings).toEqual({ name_in_model: false });

    poll.give(status(true));
    await polling;

    expect(store.status?.settings).toEqual({ name_in_model: false });
  });

  it('does not call the bridge unreachable over an old request that failed after a newer answer', async () => {
    const poll = pending<MatterStatus>();
    vi.mocked(getMatterStatus).mockReturnValueOnce(poll.promise);
    const polling = store.fetch();

    vi.mocked(getMatterStatus).mockResolvedValueOnce(status(true));
    await store.fetch();

    poll.refuse(new Error('timeout'));
    await polling;

    expect(store.isUnreachable).toBe(false);
    expect(store.status).not.toBeNull();
  });

  it('still takes answers in the order they were asked for', async () => {
    vi.mocked(getMatterStatus).mockResolvedValueOnce(status(true));
    await store.fetch();
    vi.mocked(getMatterStatus).mockResolvedValueOnce(status(false));
    await store.fetch();

    expect(store.status?.settings).toEqual({ name_in_model: false });
  });
});

describe('MatterStore, the clock of the controller', () => {
  let store: MatterStore;

  beforeEach(() => {
    vi.mocked(getMatterStatus).mockReset();
    store = new MatterStore();
  });

  it('measures how far the clock of the controller is from the clock of this browser', async () => {
    const hour = 60 * 60 * 1000;
    vi.mocked(getMatterStatus).mockResolvedValue(status(true, { now: Date.now() - hour }));

    await store.fetch();

    expect(Math.abs(store.clockOffset + hour)).toBeLessThan(1000);
  });

  it('assumes the same clock for a service that does not say what time it has', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(status(true));

    await store.fetch();

    expect(store.clockOffset).toBe(0);
  });
});
