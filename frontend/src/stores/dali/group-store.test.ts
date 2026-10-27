import { loadJsonSchema } from '@/stores/json-schema-editor';
import { daliProxyMock } from '@/test/mocks/services';
import { GroupStore } from './group-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/json-schema-editor', () => import('@/test/mocks/json-schema-editor'));
vi.mock('@/utils/format-error', () => import('@/test/mocks/format-error'));

describe('GroupStore', () => {
  let store: GroupStore;
  let parentMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    parentMock = { dropDeviceCaches: vi.fn(), removeGroup: vi.fn() };
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

    test('seeds the objectStore from the {config, schema} response', async () => {
      const config = { on_off: { enabled: false } };
      daliProxyMock.GetGroup.mockResolvedValue({ config, schema: { title: 'Group' } });

      await store.load();

      expect(store.objectStore!.value).toEqual(config);
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

    test('accepts the older bare-schema reply and seeds the schema defaults', async () => {
      // wb-mqtt-dali updates independently, so a controller can still answer with
      // the schema itself rather than {config, schema}.
      const bareSchema = { type: 'object', title: 'Group', properties: { brightness: {} } };
      daliProxyMock.GetGroup.mockResolvedValue(bareSchema);

      await store.load();

      expect(loadJsonSchema).toHaveBeenCalledWith(bareSchema);
      expect(store.objectStore).not.toBeNull();
      expect(store.objectStore!.setDefault).toHaveBeenCalled();
      expect(store.error).toBeNull();
    });

    test('still builds the editor when the reply carries a schema but no config', async () => {
      // An unconfigured group can come back without a config; the tab must still
      // render its params instead of going blank. setDefault() is deliberately no
      // longer called here, so absent params stay absent rather than being seeded.
      daliProxyMock.GetGroup.mockResolvedValue({ schema: { title: 'Group' } });

      await store.load();

      expect(store.objectStore).not.toBeNull();
      expect(store.objectStore!.setDefault).not.toHaveBeenCalled();
      expect(store.error).toBeNull();
      expect(store.isLoading).toBe(false);
    });

    test('does not create an objectStore when the response has no usable schema', async () => {
      daliProxyMock.GetGroup.mockResolvedValue({ config: {}, schema: undefined });
      vi.mocked(loadJsonSchema).mockReturnValueOnce(undefined);

      await store.load();

      expect(store.objectStore).toBeNull();
      expect(store.error).toBeNull();
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

    test('drops the group from the bus when switching on_off off takes it away', async () => {
      daliProxyMock.GetGroup.mockResolvedValue({ config: {}, schema: { title: 'Group' } });
      await store.load();
      const paramMock = { store: { value: { enabled: false }, commit: vi.fn() } };
      (vi.mocked(store.objectStore!.getParamByKey).mockReturnValue as any)(paramMock);
      daliProxyMock.SetGroup.mockResolvedValue({ config: {}, schema: {} });

      await store.saveParam('on_off');

      expect(parentMock.removeGroup).toHaveBeenCalledWith(store);
      expect(parentMock.dropDeviceCaches).not.toHaveBeenCalled();
      expect(paramMock.store.commit).not.toHaveBeenCalled();
      expect(store.error).toBeNull();
    });

    test('keeps the group when the reply still carries its config and schema', async () => {
      daliProxyMock.GetGroup.mockResolvedValue({ config: {}, schema: { title: 'Group' } });
      await store.load();
      (vi.mocked(store.objectStore!.getParamByKey).mockReturnValue as any)({
        store: { value: { enabled: false }, commit: vi.fn() },
      });
      daliProxyMock.SetGroup.mockResolvedValue({
        config: { on_off: { enabled: false } },
        schema: { properties: { on_off: {} } },
      });

      await store.saveParam('on_off');

      expect(parentMock.removeGroup).not.toHaveBeenCalled();
      expect(parentMock.dropDeviceCaches).toHaveBeenCalledWith(5);
    });

    test('keeps the group when an older backend answers the write with nothing', async () => {
      daliProxyMock.GetGroup.mockResolvedValue({ config: {}, schema: { title: 'Group' } });
      await store.load();
      (vi.mocked(store.objectStore!.getParamByKey).mockReturnValue as any)({
        store: { value: 1, commit: vi.fn() },
      });
      daliProxyMock.SetGroup.mockResolvedValue({});

      await store.saveParam('brightness');

      expect(parentMock.removeGroup).not.toHaveBeenCalled();
      expect(parentMock.dropDeviceCaches).toHaveBeenCalledWith(5);
    });
  });
});
