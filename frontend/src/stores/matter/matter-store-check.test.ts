// @vitest-environment happy-dom
import { checkFabricLink, getMatterStatus } from './api';
import MatterStore from './matter-store';
import type { MatterLinkCode, MatterStatus } from './types';

vi.mock('./api', () => ({
  getMatterStatus: vi.fn(),
  checkFabricLink: vi.fn(),
}));

const status = (code: MatterLinkCode): MatterStatus => ({
  version: '1.0.0',
  paired: true,
  fabrics: [{
    index: 2, adminFabricLabel: '', vendor_id: 0x132F, link: { code, says: '' },
  }],
  pairing: null,
  devices: { configured: 0, exposed: 0, skipped: 0, config_error: null, list: [] },
});

describe('MatterStore, the check of the link to a fabric', () => {
  let store: MatterStore;

  beforeEach(() => {
    vi.mocked(getMatterStatus).mockReset();
    vi.mocked(getMatterStatus).mockResolvedValue(status('quiet'));
    vi.mocked(checkFabricLink).mockReset();
    vi.mocked(checkFabricLink).mockResolvedValue(undefined);
    store = new MatterStore();
  });

  it('asks the bridge about the fabric and then shows what the bridge says, not an answer of its own', async () => {
    await store.fetch();
    vi.mocked(getMatterStatus).mockResolvedValue(status('left'));

    const ok = await store.checkLink(2);

    expect(ok).toBe(true);
    expect(checkFabricLink).toHaveBeenCalledWith(2);
    expect(store.status?.fabrics[0].link?.code).toBe('left');
    expect(store.checkingIndex).toBeNull();
    expect(store.hasCheckFailed).toBe(false);
  });

  it('names the fabric being checked from the click until the state has been read again', async () => {
    let answer: () => void = () => {};
    vi.mocked(checkFabricLink).mockReturnValue(new Promise<void>((resolve) => {
      answer = resolve;
    }));

    const checking = store.checkLink(2);
    expect(store.checkingIndex).toBe(2);

    answer();
    await checking;
    expect(store.checkingIndex).toBeNull();
  });

  it('says so when the bridge refused or did not answer, and forgets it at the next check', async () => {
    vi.mocked(checkFabricLink).mockRejectedValue(new Error('409'));

    expect(await store.checkLink(2)).toBe(false);
    expect(store.hasCheckFailed).toBe(true);

    vi.mocked(checkFabricLink).mockResolvedValue(undefined);
    await store.checkLink(2);
    expect(store.hasCheckFailed).toBe(false);
  });
});
