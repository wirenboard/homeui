import { daliProxyMock } from '@/test/mocks/services';
import { GroupStore } from './group-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/json-schema-editor', () => import('@/test/mocks/json-schema-editor'));
vi.mock('@/utils/format-error', () => import('@/test/mocks/format-error'));

describe('GroupStore', () => {
  let store: GroupStore;
  const parentMock = { dropDeviceCaches: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new GroupStore('bus1_g5', 5, parentMock);
  });

  describe('constructor', () => {
    test('sets id, index, and label from index', () => {
      expect(store.id).toBe('bus1_g5');
      expect(store.index).toBe(5);
      expect(store.label).toBe('5');
    });
  });

  describe('load', () => {
    test('fetches group schema and creates objectStore', async () => {
      daliProxyMock.GetGroup.mockResolvedValue({ config: {}, schema: {} });

      await store.load();

      expect(daliProxyMock.GetGroup).toHaveBeenCalledWith({ groupId: 'bus1_g5' });
      expect(store.objectStore).toBeDefined();
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    test('skips if already loaded', async () => {
      daliProxyMock.GetGroup.mockResolvedValue({ config: {}, schema: {} });
      await store.load();
      vi.clearAllMocks();

      await store.load();

      expect(daliProxyMock.GetGroup).not.toHaveBeenCalled();
    });

    test('sets error on failure', async () => {
      daliProxyMock.GetGroup.mockRejectedValue(new Error('fail'));

      await store.load();

      expect(store.error).toBe('fail');
      expect(store.isLoading).toBe(false);
    });
  });

  describe('saveParam', () => {
    test('saves parameter and drops device caches', async () => {
      daliProxyMock.GetGroup.mockResolvedValue({ config: {}, schema: {} });
      await store.load();

      const paramMock = { store: { value: 42, commit: vi.fn() } };
      (vi.mocked(store.objectStore!.getParamByKey).mockReturnValue as any)(paramMock);
      daliProxyMock.SetGroup.mockResolvedValue({});

      await store.saveParam('brightness');

      expect(daliProxyMock.SetGroup).toHaveBeenCalledWith({
        groupId: 'bus1_g5',
        config: { brightness: 42 },
      });
      expect(paramMock.store.commit).toHaveBeenCalled();
      expect(parentMock.dropDeviceCaches).toHaveBeenCalledWith(5);
    });

    test('does nothing without objectStore', async () => {
      await store.saveParam('brightness');
      expect(daliProxyMock.SetGroup).not.toHaveBeenCalled();
    });

    test('does nothing for unknown param', async () => {
      daliProxyMock.GetGroup.mockResolvedValue({ config: {}, schema: {} });
      await store.load();
      (vi.mocked(store.objectStore!.getParamByKey).mockReturnValue as any)(null);

      await store.saveParam('unknown');
      expect(daliProxyMock.SetGroup).not.toHaveBeenCalled();
    });

    test('sets error on failure', async () => {
      daliProxyMock.GetGroup.mockResolvedValue({ config: {}, schema: {} });
      await store.load();
      (vi.mocked(store.objectStore!.getParamByKey).mockReturnValue as any)({ store: { value: 1 } });
      daliProxyMock.SetGroup.mockRejectedValue(new Error('fail'));

      await store.saveParam('key');

      expect(store.error).toBe('fail');
    });
  });
});
