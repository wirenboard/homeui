import { daliProxyMock } from '@/test/mocks/services';
import { DeviceStore } from './device-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/json-schema-editor', () => import('@/test/mocks/json-schema-editor'));
vi.mock('@/utils/format-error', () => import('@/test/mocks/format-error'));

describe('DeviceStore', () => {
  let store: DeviceStore;
  const parentMock = {
    children: [] as any[],
    syncGroupChildren: vi.fn(),
    objectStore: {},
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new DeviceStore('dev1', 'Lamp', [1, 3], parentMock);
    parentMock.children = [store];
    parentMock.objectStore = {};
  });

  describe('constructor', () => {
    test('sets id, label, and groups', () => {
      expect(store.id).toBe('dev1');
      expect(store.label).toBe('Lamp');
      expect(store.groups).toEqual([1, 3]);
      expect(store.parent).toBe(parentMock);
    });
  });

  describe('load', () => {
    test('fetches device data and updates groups from boolean array', async () => {
      daliProxyMock.GetDevice.mockResolvedValue({
        config: { groups: [false, true, false, true] },
        schema: {},
        name: 'Updated Lamp',
        groups: [false, true, false, true],
      });

      await store.load();

      expect(daliProxyMock.GetDevice).toHaveBeenCalledWith({ deviceId: 'dev1' });
      expect(store.label).toBe('Updated Lamp');
      expect(store.groups).toEqual([1, 3]);
      expect(store.objectStore).toBeDefined();
      expect(store.isLoading).toBe(false);
      expect(parentMock.syncGroupChildren).toHaveBeenCalled();
    });

    test('skips if already loaded and not forced', async () => {
      daliProxyMock.GetDevice.mockResolvedValue({
        config: {},
        schema: {},
        name: '',
      });
      await store.load();
      vi.clearAllMocks();

      await store.load();
      expect(daliProxyMock.GetDevice).not.toHaveBeenCalled();
    });

    test('reloads when forced', async () => {
      daliProxyMock.GetDevice.mockResolvedValue({
        config: {},
        schema: {},
        name: '',
      });
      await store.load();
      vi.clearAllMocks();
      daliProxyMock.GetDevice.mockResolvedValue({
        config: {},
        schema: {},
        name: '',
      });

      await store.load(true);
      expect(daliProxyMock.GetDevice).toHaveBeenCalledWith({ deviceId: 'dev1', forceReload: true });
    });

    test('sets error on failure', async () => {
      daliProxyMock.GetDevice.mockRejectedValue(new Error('fail'));

      await store.load();

      expect(store.error).toBe('fail');
      expect(store.isLoading).toBe(false);
    });
  });

  describe('save', () => {
    test('saves config and updates groups', async () => {
      daliProxyMock.GetDevice.mockResolvedValue({ config: {}, schema: {}, name: '' });
      await store.load();

      daliProxyMock.SetDevice.mockResolvedValue({
        name: 'Saved',
        groups: [true, false, true],
      });

      await store.save();

      expect(store.label).toBe('Saved');
      expect(store.groups).toEqual([0, 2]);
      expect(store.isLoading).toBe(false);
    });

    test('does nothing without objectStore', async () => {
      await store.save();
      expect(daliProxyMock.SetDevice).not.toHaveBeenCalled();
    });

    test('sets error on failure', async () => {
      daliProxyMock.GetDevice.mockResolvedValue({ config: {}, schema: {}, name: '' });
      await store.load();
      daliProxyMock.SetDevice.mockRejectedValue(new Error('fail'));

      await store.save();
      expect(store.error).toBe('fail');
    });
  });

  describe('dropCache', () => {
    test('nulls objectStore', async () => {
      daliProxyMock.GetDevice.mockResolvedValue({ config: {}, schema: {}, name: '' });
      await store.load();
      expect(store.objectStore).toBeDefined();

      store.dropCache();
      expect(store.objectStore).toBeNull();
    });
  });

  describe('identify', () => {
    test('calls API', async () => {
      daliProxyMock.IdentifyDevice.mockResolvedValue(undefined);
      await store.identify();
      expect(daliProxyMock.IdentifyDevice).toHaveBeenCalledWith({ deviceId: 'dev1' });
    });

    test('sets error on failure', async () => {
      daliProxyMock.IdentifyDevice.mockRejectedValue(new Error('fail'));
      await store.identify();
      expect(store.error).toBe('fail');
    });
  });

  describe('resetSettings', () => {
    test('calls API then reloads', async () => {
      daliProxyMock.ResetDeviceSettings.mockResolvedValue(undefined);
      daliProxyMock.GetDevice.mockResolvedValue({ config: {}, schema: {}, name: '' });

      await store.resetSettings();

      expect(daliProxyMock.ResetDeviceSettings).toHaveBeenCalledWith({ deviceId: 'dev1' });
      expect(daliProxyMock.GetDevice).toHaveBeenCalledWith({ deviceId: 'dev1', forceReload: true });
    });

    test('sets error and skips reload on failure', async () => {
      daliProxyMock.ResetDeviceSettings.mockRejectedValue(new Error('fail'));

      await store.resetSettings();

      expect(store.error).toBe('fail');
      expect(daliProxyMock.GetDevice).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    test('removes device from parent and clears parent objectStore', async () => {
      daliProxyMock.ResetDevice.mockResolvedValue(undefined);

      await store.reset();

      expect(daliProxyMock.ResetDevice).toHaveBeenCalledWith({ deviceId: 'dev1' });
      expect(parentMock.children).not.toContain(store);
      expect(parentMock.syncGroupChildren).toHaveBeenCalled();
      expect(parentMock.objectStore).toBeNull();
    });

    test('sets error on failure', async () => {
      daliProxyMock.ResetDevice.mockRejectedValue(new Error('fail'));

      await store.reset();

      expect(store.error).toBe('fail');
    });
  });
});
