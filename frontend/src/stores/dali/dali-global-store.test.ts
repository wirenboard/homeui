import { autorun, runInAction } from 'mobx';
import { consolePanelStore } from '@/stores/console-panel';
import { daliProxyMock, mqttClientMock } from '@/test/mocks/services';
import { busTabId } from './bus-tab-id';
import { DaliGlobalStore } from './dali-global-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
// The real i18n config touches `document` at import; the store only needs `t`.
vi.mock('@/i18n/config', () => ({ default: { t: (key: string) => key } }));

// `consolePanelStore` is a singleton constructed at import time and reads
// localStorage in its field initializers, so the stub has to be in place before
// that import runs — hence vi.hoisted (lifted above the imports). A plain
// top-level assignment as in console-panel-store.test.ts would run too late here,
// since that test constructs the store lazily inside each case.
vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: () => null, setItem: () => {} },
    configurable: true,
  });
});

const hasTab = (busId: string) => consolePanelStore.tabs.some((t) => t.id === busTabId(busId));

describe('DaliGlobalStore', () => {
  let store: DaliGlobalStore;

  beforeEach(() => {
    vi.clearAllMocks();
    runInAction(() => {
      consolePanelStore.tabs = [];
      consolePanelStore.activeTabId = null;
      consolePanelStore.isVisible = false;
    });
    store = new DaliGlobalStore();
  });

  describe('refresh', () => {
    test('connects, fetches and returns the gateway list', async () => {
      const gateways = [{ id: 'gw1', name: 'GW', buses: [] }];
      daliProxyMock.GetList.mockResolvedValue(gateways);

      const result = await store.refresh();

      expect(mqttClientMock.whenConnected).toHaveBeenCalled();
      expect(daliProxyMock.GetList).toHaveBeenCalled();
      expect(result).toEqual(gateways);
    });

    test('dedupes concurrent refreshes into a single request', async () => {
      daliProxyMock.GetList.mockResolvedValue([]);

      await Promise.all([store.refresh(), store.refresh()]);

      expect(daliProxyMock.GetList).toHaveBeenCalledTimes(1);
    });

    test('enables a bus monitor tab for buses with bus_monitor_enabled', async () => {
      daliProxyMock.GetList.mockResolvedValue([
        { id: 'gw1', name: 'GW', buses: [{ id: 'bus1', name: 'Bus', bus_monitor_enabled: true }] },
      ]);

      await store.refresh();

      expect(store.get('bus1')).toBeDefined();
      expect(hasTab('bus1')).toBe(true);
      expect(mqttClientMock.addStickySubscription).toHaveBeenCalledWith(
        '/wb-dali/bus1/bus_monitor',
        expect.any(Function),
      );
    });

    test('disables monitors for buses that disappear from the list', async () => {
      daliProxyMock.GetList.mockResolvedValue([
        { id: 'gw1', name: 'GW', buses: [{ id: 'bus1', name: 'Bus', bus_monitor_enabled: true }] },
      ]);
      await store.refresh();
      expect(store.get('bus1')).toBeDefined();

      daliProxyMock.GetList.mockResolvedValue([{ id: 'gw1', name: 'GW', buses: [] }]);
      await store.refresh();

      expect(store.get('bus1')).toBeUndefined();
      expect(hasTab('bus1')).toBe(false);
    });
  });

  describe('enable / disable / get', () => {
    test('enable registers a monitor and a console tab', () => {
      store.enable('bus1', { gatewayName: 'GW', busIndex: 1, autoShow: false });

      expect(store.get('bus1')).toBeDefined();
      expect(hasTab('bus1')).toBe(true);
    });

    test('enable is idempotent — no duplicate tab', () => {
      store.enable('bus1', { gatewayName: 'GW', busIndex: 1, autoShow: false });
      store.enable('bus1', { gatewayName: 'GW', busIndex: 2, autoShow: false });

      expect(consolePanelStore.tabs.filter((t) => t.id === busTabId('bus1'))).toHaveLength(1);
    });

    test('disable removes the monitor and the tab', () => {
      store.enable('bus1', { gatewayName: 'GW', busIndex: 1, autoShow: false });
      store.disable('bus1');

      expect(store.get('bus1')).toBeUndefined();
      expect(hasTab('bus1')).toBe(false);
    });

    test('autoShow reveals the panel and focuses the tab on first enable', () => {
      store.enable('bus1', { gatewayName: 'GW', busIndex: 1, autoShow: true });

      expect(consolePanelStore.isVisible).toBe(true);
      expect(consolePanelStore.activeTabId).toBe(busTabId('bus1'));
    });
  });

  describe('closing the tab (onClose)', () => {
    test('persists the disabled flag and tears the monitor down on success', async () => {
      store.enable('bus1', { gatewayName: 'GW', busIndex: 1, autoShow: false });
      daliProxyMock.SetBus.mockResolvedValue(undefined);

      consolePanelStore.unregisterTab(busTabId('bus1'));
      await Promise.resolve();

      expect(daliProxyMock.SetBus).toHaveBeenCalledWith({
        busId: 'bus1',
        config: { bus_monitor_enabled: false },
      });
      expect(store.isMonitorEnabled('bus1')).toBe(false);
      expect(hasTab('bus1')).toBe(false);
    });

    test('reverts the close (re-registers the tab) when the write fails', async () => {
      store.enable('bus1', { gatewayName: 'GW', busIndex: 1, autoShow: false });
      daliProxyMock.SetBus.mockRejectedValue(new Error('fail'));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      consolePanelStore.unregisterTab(busTabId('bus1'));
      await new Promise((resolve) => setTimeout(resolve));

      expect(store.isMonitorEnabled('bus1')).toBe(true);
      expect(hasTab('bus1')).toBe(true);
      warn.mockRestore();
    });
  });

  describe('updateLabel', () => {
    test('updates the registered tab label', () => {
      store.enable('bus1', { gatewayName: 'GW', busIndex: 1, autoShow: false });

      store.updateLabel('bus1', { gatewayName: 'New GW', busIndex: 3 });

      const tab = consolePanelStore.tabs.find((t) => t.id === busTabId('bus1'));
      expect(tab?.label).toContain('New GW');
    });
  });

  describe('setBusMonitorEnabled', () => {
    test('persists the flag and enables the monitor + tab when turned on', async () => {
      daliProxyMock.SetBus.mockResolvedValue(undefined);

      await store.setBusMonitorEnabled('bus1', true, { gatewayName: 'GW', busIndex: 1 });

      expect(daliProxyMock.SetBus).toHaveBeenCalledWith({
        busId: 'bus1',
        config: { bus_monitor_enabled: true },
      });
      expect(store.isMonitorEnabled('bus1')).toBe(true);
      expect(hasTab('bus1')).toBe(true);
    });

    test('persists the flag and disables the monitor when turned off', async () => {
      daliProxyMock.SetBus.mockResolvedValue(undefined);
      await store.setBusMonitorEnabled('bus1', true, { gatewayName: 'GW', busIndex: 1 });

      await store.setBusMonitorEnabled('bus1', false, { gatewayName: 'GW', busIndex: 1 });

      expect(daliProxyMock.SetBus).toHaveBeenLastCalledWith({
        busId: 'bus1',
        config: { bus_monitor_enabled: false },
      });
      expect(store.isMonitorEnabled('bus1')).toBe(false);
      expect(hasTab('bus1')).toBe(false);
    });

    test('propagates the error and does not enable when the write fails', async () => {
      daliProxyMock.SetBus.mockRejectedValue(new Error('fail'));

      await expect(
        store.setBusMonitorEnabled('bus1', true, { gatewayName: 'GW', busIndex: 1 }),
      ).rejects.toThrow('fail');
      expect(store.isMonitorEnabled('bus1')).toBe(false);
      expect(hasTab('bus1')).toBe(false);
    });
  });

  describe('isMonitorEnabled', () => {
    test('reflects enable and disable', () => {
      expect(store.isMonitorEnabled('bus1')).toBe(false);

      store.enable('bus1', { gatewayName: 'GW', busIndex: 1, autoShow: false });
      expect(store.isMonitorEnabled('bus1')).toBe(true);

      store.disable('bus1');
      expect(store.isMonitorEnabled('bus1')).toBe(false);
    });

    test('is reactive — drives the toggle without the old callback handshake', () => {
      const seen: boolean[] = [];
      const dispose = autorun(() => seen.push(store.isMonitorEnabled('bus1')));

      store.enable('bus1', { gatewayName: 'GW', busIndex: 1, autoShow: false });
      store.disable('bus1');
      dispose();

      expect(seen).toEqual([false, true, false]);
    });
  });

  describe('reset', () => {
    test('disables every monitor and removes their tabs', () => {
      store.enable('bus1', { gatewayName: 'GW', busIndex: 1, autoShow: false });
      store.enable('bus2', { gatewayName: 'GW', busIndex: 2, autoShow: false });

      store.reset();

      expect(store.get('bus1')).toBeUndefined();
      expect(store.get('bus2')).toBeUndefined();
      expect(hasTab('bus1')).toBe(false);
      expect(hasTab('bus2')).toBe(false);
    });

    test('is a no-op when nothing is registered', () => {
      expect(() => store.reset()).not.toThrow();
    });
  });
});
