import { daliBusProxyMock } from '@/test/mocks/services';
import { BusCommandsStore, NOT_SENT_MARKER } from './bus-commands-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/utils/format-error', () => import('@/test/mocks/format-error'));

describe('BusCommandsStore', () => {
  let store: BusCommandsStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new BusCommandsStore('bus1');
  });

  describe('parseCommands', () => {
    test('splits text into trimmed non-empty lines', () => {
      store.setText('cmd1\n  cmd2  \n\ncmd3');
      expect(store.parseCommands()).toEqual(['cmd1', 'cmd2', 'cmd3']);
    });

    test('returns empty array for blank text', () => {
      expect(store.parseCommands()).toEqual([]);
    });
  });

  describe('hasRunnableCommands', () => {
    test('returns false when text is empty', () => {
      expect(store.hasRunnableCommands).toBe(false);
    });

    test('returns true when text has commands', () => {
      store.setText('cmd1');
      expect(store.hasRunnableCommands).toBe(true);
    });
  });

  describe('run', () => {
    test('sends commands and populates results', async () => {
      store.setText('cmd1\ncmd2');
      daliBusProxyMock.SendCommand.mockResolvedValue([
        { status: 'ok', response: { raw: 0, value: 'yes' } },
        { status: 'error', error: 'timeout' },
      ]);

      await store.run();

      expect(daliBusProxyMock.SendCommand).toHaveBeenCalledWith({
        busId: 'bus1',
        commands: ['cmd1', 'cmd2'],
      });
      expect(store.results).toEqual([
        { command: 'cmd1', status: 'ok', response: { raw: 0, value: 'yes' }, error: undefined },
        { command: 'cmd2', status: 'error', response: undefined, error: 'timeout' },
      ]);
      expect(store.isRunning).toBe(false);
    });

    test('marks unsent commands when result is truncated', async () => {
      store.setText('cmd1\ncmd2');
      daliBusProxyMock.SendCommand.mockResolvedValue([
        { status: 'ok' },
      ]);

      await store.run();

      expect(store.truncated).toBe(true);
      expect(store.results[1]).toMatchObject({
        command: 'cmd2',
        status: 'error',
        error: NOT_SENT_MARKER,
      });
    });

    test('sets runError on failure', async () => {
      store.setText('cmd1');
      daliBusProxyMock.SendCommand.mockRejectedValue(new Error('network'));

      await store.run();

      expect(store.runError).toBe('network');
      expect(store.isRunning).toBe(false);
    });

    test('does nothing when no commands', async () => {
      await store.run();
      expect(daliBusProxyMock.SendCommand).not.toHaveBeenCalled();
    });

    test('does nothing when already running', async () => {
      store.setText('cmd1');
      store.isRunning = true;
      await store.run();
      expect(daliBusProxyMock.SendCommand).not.toHaveBeenCalled();
    });
  });

  describe('loadCatalog', () => {
    test('loads catalog entries', async () => {
      const entries = [{ name: 'OFF', category: 'basic', snippet: 'OFF' }];
      daliBusProxyMock.ListCommands.mockResolvedValue(entries);

      await store.loadCatalog();

      expect(store.catalog).toEqual(entries);
      expect(store.isCatalogLoading).toBe(false);
    });

    test('skips if already loaded', async () => {
      store.catalog = [];
      await store.loadCatalog();
      expect(daliBusProxyMock.ListCommands).not.toHaveBeenCalled();
    });

    test('sets catalogError on failure', async () => {
      daliBusProxyMock.ListCommands.mockRejectedValue(new Error('fail'));

      await store.loadCatalog();

      expect(store.catalogError).toBe('fail');
    });
  });

  describe('openCatalog / closeCatalog', () => {
    test('openCatalog opens modal and triggers load', () => {
      daliBusProxyMock.ListCommands.mockResolvedValue([]);
      store.openCatalog();
      expect(store.isCatalogModalOpen).toBe(true);
    });

    test('closeCatalog closes modal', () => {
      store.isCatalogModalOpen = true;
      store.closeCatalog();
      expect(store.isCatalogModalOpen).toBe(false);
    });
  });
});
