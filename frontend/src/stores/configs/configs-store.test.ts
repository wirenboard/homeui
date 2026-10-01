import { configEditorProxyMock, mqttClientMock } from '@/test/mocks/services';
import ConfigsStore from './configs-store';
import type { Config, ConfigListItem } from './types';

vi.mock('@/services', () => import('@/test/mocks/services'));

describe('ConfigsStore', () => {
  let store: ConfigsStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new ConfigsStore();
  });

  describe('getList', () => {
    test('fetches configs after mqtt connects', async () => {
      const configs: ConfigListItem[] = [
        {
          title: 'Serial',
          description: 'Serial config',
          editor: 'json',
          schemaPath: '/schema',
          configPath: '/etc/serial.conf',
          titleTranslations: { ru: 'Серийный' },
        },
      ];
      configEditorProxyMock.List.mockResolvedValue(configs);

      await store.getList();

      expect(mqttClientMock.whenConnected).toHaveBeenCalled();
      expect(configEditorProxyMock.List).toHaveBeenCalled();
      expect(store.configs).toEqual(configs);
    });
  });

  describe('getConfig', () => {
    test('loads config and sets path', async () => {
      const config: Config = {
        configPath: '/etc/wb.conf',
        content: { key: 'value' },
        schema: {},
      };
      configEditorProxyMock.Load.mockResolvedValue(config);

      await store.getConfig('/etc/wb.conf');

      expect(configEditorProxyMock.Load).toHaveBeenCalledWith({ path: '/etc/wb.conf' });
      expect(store.config).toEqual(config);
      expect(store.path).toBe('/etc/wb.conf');
    });
  });

  describe('saveConfig', () => {
    test('saves with provided content', async () => {
      store.config = { configPath: '/etc/wb.conf', content: { old: true }, schema: {} };
      configEditorProxyMock.Save.mockResolvedValue(undefined);

      await store.saveConfig({ new: true });

      expect(configEditorProxyMock.Save).toHaveBeenCalledWith({
        path: '/etc/wb.conf',
        content: { new: true },
      });
    });

    test('falls back to current config content when no argument', async () => {
      store.config = { configPath: '/etc/wb.conf', content: { current: true }, schema: {} };
      configEditorProxyMock.Save.mockResolvedValue(undefined);

      await store.saveConfig();

      expect(configEditorProxyMock.Save).toHaveBeenCalledWith({
        path: '/etc/wb.conf',
        content: { current: true },
      });
    });
  });

  describe('clearConfig', () => {
    test('sets config to null', () => {
      store.config = { configPath: '/etc/wb.conf', content: {}, schema: {} };
      store.clearConfig();
      expect(store.config).toBeNull();
    });
  });

  describe('setContent', () => {
    test('updates config content', () => {
      store.config = { configPath: '/etc/wb.conf', content: { old: true }, schema: {} };
      store.setContent({ updated: true });
      expect(store.config.content).toEqual({ updated: true });
    });
  });
});
