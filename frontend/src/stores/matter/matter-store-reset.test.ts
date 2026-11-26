// @vitest-environment happy-dom
import { getMatterStatus, openMatterWindow, resetMatterBridge } from './api';
import MatterStore from './matter-store';

vi.mock('./api', () => ({
  getMatterStatus: vi.fn(),
  openMatterWindow: vi.fn(),
  resetMatterBridge: vi.fn(),
}));

const STATUS = {
  version: '0.0.1',
  paired: false,
  fabrics: [],
  pairing: null,
  devices: { configured: 0, exposed: 0, skipped: 0, config_error: null, list: [] },
};

/** A call the test answers when it chooses, to look at the store in between. */
const held = <T>() => {
  let answer: (_value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    answer = resolve;
  });
  return { promise, answer };
};

describe('MatterStore, the reset of the bridge and a window on its way', () => {
  let store: MatterStore;

  beforeEach(() => {
    vi.mocked(getMatterStatus).mockReset();
    vi.mocked(getMatterStatus).mockResolvedValue(STATUS as any);
    vi.mocked(openMatterWindow).mockReset();
    vi.mocked(resetMatterBridge).mockReset();
    store = new MatterStore();
  });

  afterEach(() => {
    store.stopWatching();
  });

  it('is busy while the bridge is being reset, reads the state after, and says it went through', async () => {
    const call = held<void>();
    vi.mocked(resetMatterBridge).mockReturnValue(call.promise);

    const done = store.resetBridge();
    expect(store.isResetting).toBe(true);
    call.answer();

    expect(await done).toBe(true);
    expect(store.isResetting).toBe(false);
    expect(store.hasResetFailed).toBe(false);
    expect(getMatterStatus).toHaveBeenCalledTimes(1);
  });

  it('says that the reset failed, until the dialog that said so is closed', async () => {
    vi.mocked(resetMatterBridge).mockRejectedValue(new Error('409'));

    expect(await store.resetBridge()).toBe(false);
    expect(store.hasResetFailed).toBe(true);

    store.forgetDialogFailures();
    expect(store.hasResetFailed).toBe(false);
  });

  it('says that a window is being opened only while that request is on its way', async () => {
    const call = held<{ ok: boolean }>();
    vi.mocked(openMatterWindow).mockReturnValue(call.promise as any);

    const done = store.openWindow();
    expect(store.isOpeningWindow).toBe(true);
    call.answer({ ok: true });
    await done;

    expect(store.isOpeningWindow).toBe(false);
  });
});
