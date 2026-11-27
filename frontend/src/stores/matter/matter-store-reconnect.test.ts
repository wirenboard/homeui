// @vitest-environment happy-dom
import { getMatterStatus, openMatterWindow, unpairFabric } from './api';
import MatterStore from './matter-store';

vi.mock('./api', () => ({
  getMatterStatus: vi.fn(),
  openMatterWindow: vi.fn(),
  unpairFabric: vi.fn(),
}));

const STATUS = {
  version: '0.0.1',
  paired: false,
  fabrics: [],
  pairing: null,
  devices: { configured: 0, exposed: 0, skipped: 0, config_error: null, list: [] },
};

describe('MatterStore, reconnecting a fabric as an advice of the bridge offers', () => {
  let store: MatterStore;

  beforeEach(() => {
    vi.mocked(getMatterStatus).mockReset();
    vi.mocked(getMatterStatus).mockResolvedValue(STATUS as any);
    vi.mocked(openMatterWindow).mockReset();
    vi.mocked(unpairFabric).mockReset();
    store = new MatterStore();
  });

  afterEach(() => {
    store.stopWatching();
  });

  it('drops the fabric and then opens the way in, in that order', async () => {
    const calls: string[] = [];
    vi.mocked(unpairFabric).mockImplementation(async () => {
      calls.push('unpair');
    });
    vi.mocked(openMatterWindow).mockImplementation(async () => {
      calls.push('open');
      return {} as any;
    });

    expect(await store.reconnect(3)).toBe(true);

    expect(calls).toEqual(['unpair', 'open']);
    expect(unpairFabric).toHaveBeenCalledWith(3);
  });

  it('opens nothing when the fabric could not be dropped, and says that it failed', async () => {
    vi.mocked(unpairFabric).mockRejectedValue(new Error('500'));

    expect(await store.reconnect(3)).toBe(false);

    expect(openMatterWindow).not.toHaveBeenCalled();
    expect(store.hasUnpairFailed).toBe(true);
  });

  it('says so when the fabric is gone and the way in did not open', async () => {
    vi.mocked(unpairFabric).mockResolvedValue(undefined);
    vi.mocked(openMatterWindow).mockRejectedValue(new Error('409'));

    expect(await store.reconnect(3)).toBe(false);

    expect(store.hasUnpairFailed).toBe(false);
    expect(store.hasWindowFailed).toBe(true);
  });
});
