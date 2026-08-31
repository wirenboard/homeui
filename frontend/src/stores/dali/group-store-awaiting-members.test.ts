import { daliProxyMock } from '@/test/mocks/services';
import { GroupStore } from './group-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/json-schema-editor', () => import('@/test/mocks/json-schema-editor'));
vi.mock('@/utils/format-error', () => import('@/test/mocks/format-error'));

describe('GroupStore keeps asking while the group members initialize', () => {
  let store: GroupStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new GroupStore('bus1_g5', 5, { dropDeviceCaches: vi.fn() } as any);
  });

  test('an empty GetGroup answer is not cached: the next load asks again', async () => {
    // While no member device has finished initializing, GetGroup merges over
    // nothing and legitimately answers an empty schema. Caching it froze the
    // tab on "controls only" for the whole session.
    daliProxyMock.GetGroup.mockResolvedValue({});
    await store.load();
    expect(store.isAwaitingMembers).toBe(true);
    expect(store.objectStore).toBeDefined();

    daliProxyMock.GetGroup.mockResolvedValue({ properties: { min_level: {} } });
    await store.load();
    expect(daliProxyMock.GetGroup).toHaveBeenCalledTimes(2);
    expect(store.isAwaitingMembers).toBe(false);
  });

  test('a loaded group stays loaded: no refetch once parameters arrived', async () => {
    daliProxyMock.GetGroup.mockResolvedValue({ properties: { min_level: {} } });
    await store.load();
    vi.clearAllMocks();

    await store.load();
    expect(daliProxyMock.GetGroup).not.toHaveBeenCalled();
  });
});
