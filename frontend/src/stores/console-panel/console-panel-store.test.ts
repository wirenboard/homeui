import { ConsolePanelStore } from './console-panel-store';
import type { ConsoleTab } from './types';

const makeTab = (id: string): ConsoleTab => ({
  id,
  label: id,
  getLogs: vi.fn(() => []),
  renderLog: vi.fn(),
  clearLogs: vi.fn(),
});

const getItemMock = vi.fn();
const setItemMock = vi.fn();
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: getItemMock, setItem: setItemMock },
});

describe('ConsolePanelStore', () => {
  let store: ConsolePanelStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new ConsolePanelStore();
  });

  describe('registerTab', () => {
    test('adds tab and sets it as active when first', () => {
      const tab = makeTab('logs');
      store.registerTab(tab);
      expect(store.tabs).toHaveLength(1);
      expect(store.activeTabId).toBe('logs');
    });

    test('does not override activeTabId on subsequent tabs', () => {
      store.registerTab(makeTab('first'));
      store.registerTab(makeTab('second'));
      expect(store.tabs).toHaveLength(2);
      expect(store.activeTabId).toBe('first');
    });

    test('ignores duplicate tab ids', () => {
      store.registerTab(makeTab('logs'));
      store.registerTab(makeTab('logs'));
      expect(store.tabs).toHaveLength(1);
    });
  });

  describe('unregisterTab', () => {
    test('removes tab from list', () => {
      store.registerTab(makeTab('a'));
      store.registerTab(makeTab('b'));
      store.unregisterTab('a');
      expect(store.tabs).toHaveLength(1);
      expect(store.tabs[0].id).toBe('b');
    });

    test('switches activeTabId to first remaining tab', () => {
      store.registerTab(makeTab('a'));
      store.registerTab(makeTab('b'));
      store.unregisterTab('a');
      expect(store.activeTabId).toBe('b');
    });

    test('sets activeTabId to null when last tab removed', () => {
      store.registerTab(makeTab('only'));
      store.unregisterTab('only');
      expect(store.activeTabId).toBeNull();
    });

    test('keeps activeTabId if removed tab was not active', () => {
      store.registerTab(makeTab('a'));
      store.registerTab(makeTab('b'));
      store.unregisterTab('b');
      expect(store.activeTabId).toBe('a');
    });
  });

  describe('setActiveTab', () => {
    test('changes active tab', () => {
      store.registerTab(makeTab('a'));
      store.registerTab(makeTab('b'));
      store.setActiveTab('b');
      expect(store.activeTabId).toBe('b');
    });

    test('ignores unknown tab id', () => {
      store.registerTab(makeTab('a'));
      store.setActiveTab('unknown');
      expect(store.activeTabId).toBe('a');
    });
  });

  describe('show / hide / toggleVisibility', () => {
    test('show sets isVisible to true', () => {
      store.show();
      expect(store.isVisible).toBe(true);
    });

    test('show with tabId activates that tab', () => {
      store.registerTab(makeTab('a'));
      store.registerTab(makeTab('b'));
      store.show('b');
      expect(store.isVisible).toBe(true);
      expect(store.activeTabId).toBe('b');
    });

    test('hide sets isVisible to false', () => {
      store.show();
      store.hide();
      expect(store.isVisible).toBe(false);
    });

    test('toggleVisibility flips state', () => {
      expect(store.isVisible).toBe(false);
      store.toggleVisibility();
      expect(store.isVisible).toBe(true);
      store.toggleVisibility();
      expect(store.isVisible).toBe(false);
    });
  });

  describe('setPosition', () => {
    test('updates position and persists to localStorage', () => {
      store.setPosition('right');
      expect(store.position).toBe('right');
      expect(setItemMock).toHaveBeenCalledWith('console-panel-position', 'right');
    });
  });

  describe('setHeight', () => {
    test('updates height and persists to localStorage', () => {
      store.setHeight('400px');
      expect(store.height).toBe('400px');
      expect(setItemMock).toHaveBeenCalledWith('console-panel-height', '400px');
    });
  });

  describe('setWidth', () => {
    test('updates width and persists to localStorage', () => {
      store.setWidth('500px');
      expect(store.width).toBe('500px');
      expect(setItemMock).toHaveBeenCalledWith('console-panel-width', '500px');
    });
  });

  describe('activeTab', () => {
    test('returns the active tab', () => {
      store.registerTab(makeTab('logs'));
      expect(store.activeTab?.id).toBe('logs');
    });

    test('returns undefined when no active tab', () => {
      expect(store.activeTab).toBeUndefined();
    });
  });

  describe('constructor reads localStorage', () => {
    test('uses stored position', () => {
      getItemMock.mockReturnValueOnce('right');
      const s = new ConsolePanelStore();
      expect(s.position).toBe('right');
    });

    test('defaults to bottom when not stored', () => {
      getItemMock.mockReturnValueOnce(null);
      const s = new ConsolePanelStore();
      expect(s.position).toBe('bottom');
    });
  });
});
