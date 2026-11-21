// @vitest-environment happy-dom
import { getMatterStatus, setMatterSettings } from './api';
import MatterStore from './matter-store';
import type { MatterStatus } from './types';

vi.mock('./api', () => ({
  getMatterStatus: vi.fn(),
  setMatterSettings: vi.fn(),
}));

const status = (nameInModel: boolean): MatterStatus => ({
  version: '1.0.0',
  paired: false,
  fabrics: [],
  pairing: null,
  devices: { configured: 0, exposed: 0, skipped: 0, config_error: null, list: [] },
  settings: { name_in_model: nameInModel },
});

describe('MatterStore, the switches of the page', () => {
  let store: MatterStore;

  beforeEach(() => {
    vi.mocked(getMatterStatus).mockReset();
    vi.mocked(getMatterStatus).mockResolvedValue(status(true));
    vi.mocked(setMatterSettings).mockReset();
    vi.mocked(setMatterSettings).mockResolvedValue(undefined);
    store = new MatterStore();
  });

  it('sends the change and then believes the state the bridge gives, not the click', async () => {
    await store.fetch();
    vi.mocked(getMatterStatus).mockResolvedValue(status(false));

    const ok = await store.setSettings({ name_in_model: false });

    expect(ok).toBe(true);
    expect(setMatterSettings).toHaveBeenCalledWith({ name_in_model: false });
    expect(store.status?.settings).toEqual({ name_in_model: false });
    expect(store.isSavingSettings).toBe(false);
    expect(store.hasSettingsFailed).toBe(false);
  });

  it('is busy from the click until the state has been read again', async () => {
    let answer: () => void = () => {};
    vi.mocked(setMatterSettings).mockReturnValue(new Promise<void>((resolve) => {
      answer = resolve;
    }));

    const saving = store.setSettings({ name_in_model: false });
    expect(store.isSavingSettings).toBe(true);

    answer();
    await saving;
    expect(store.isSavingSettings).toBe(false);
  });

  it('says so when the bridge refused, and shows what the bridge still holds', async () => {
    await store.fetch();
    vi.mocked(setMatterSettings).mockRejectedValue(new Error('400'));

    const ok = await store.setSettings({ name_in_model: false });

    expect(ok).toBe(false);
    expect(store.hasSettingsFailed).toBe(true);
    expect(store.isSavingSettings).toBe(false);
    expect(store.status?.settings).toEqual({ name_in_model: true });
  });

  it('forgets the failure when the next change starts', async () => {
    vi.mocked(setMatterSettings).mockRejectedValueOnce(new Error('400'));
    await store.setSettings({ name_in_model: false });
    expect(store.hasSettingsFailed).toBe(true);

    await store.setSettings({ name_in_model: false });

    expect(store.hasSettingsFailed).toBe(false);
  });
});
