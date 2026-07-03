import { mqttClientMock } from '@/test/mocks/services';
import DevicesStore from './devices-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/i18n/config', () => ({ default: { language: 'en' } }));
vi.mock('@/utils/color', () => ({
  hexToRgb: vi.fn((v: string) => v),
  isHex: vi.fn(() => false),
  rgbToHex: vi.fn(() => '#000000'),
}));

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, val: string) => storage.set(key, val)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
  },
});

function simulateMessage(store: DevicesStore, topic: string, payload: string) {
  const handler = mqttClientMock.addStickySubscription.mock.calls[0][1];
  handler({ topic, payload });
}

function seedDevice(store: DevicesStore, deviceId: string, controls: string[] = []) {
  simulateMessage(store, `/devices/${deviceId}/meta/name`, deviceId);
  for (const ctrl of controls) {
    simulateMessage(store, `/devices/${deviceId}/controls/${ctrl}/meta/type`, 'value');
    simulateMessage(store, `/devices/${deviceId}/controls/${ctrl}`, '0');
  }
}

describe('DevicesStore', () => {
  let store: DevicesStore;

  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
    store = new DevicesStore();
  });

  describe('constructor', () => {
    test('subscribes to /devices/#', () => {
      expect(mqttClientMock.addStickySubscription).toHaveBeenCalledWith(
        '/devices/#',
        expect.any(Function),
      );
    });
  });

  describe('MQTT message handling', () => {
    test('creates device on meta/name message', () => {
      simulateMessage(store, '/devices/lamp/meta/name', 'My Lamp');
      expect(store.devices.has('lamp')).toBe(true);
      expect(store.devices.get('lamp').name).toBe('My Lamp');
    });

    test('creates cell on control value message', () => {
      simulateMessage(store, '/devices/lamp/controls/brightness/meta/type', 'range');
      simulateMessage(store, '/devices/lamp/controls/brightness', '50');
      expect(store.cells.has('lamp/brightness')).toBe(true);
      expect(store.cells.get('lamp/brightness').value).toBe(50);
    });

    test('adds cell to device when complete', () => {
      seedDevice(store, 'lamp', ['brightness']);
      expect(store.devices.get('lamp').cells.has('lamp/brightness')).toBe(true);
    });
  });

  describe('filteredDevices', () => {
    test('excludes system devices by default', () => {
      seedDevice(store, 'lamp', ['on']);
      seedDevice(store, 'system__wb', ['uptime']);

      expect(store.filteredDevices.has('lamp')).toBe(true);
      expect(store.filteredDevices.has('system__wb')).toBe(false);
    });

    test('includes system devices when setting enabled', () => {
      storage.set('show-system-devices', 'yes');
      seedDevice(store, 'system__wb', ['uptime']);

      expect(store.filteredDevices.has('system__wb')).toBe(true);
    });
  });

  describe('getDeviceCells', () => {
    test('returns non-hidden cells for device', () => {
      seedDevice(store, 'lamp', ['brightness', 'power']);

      const cells = store.getDeviceCells('lamp');
      expect(cells.map((c) => c.controlId)).toEqual(
        expect.arrayContaining(['brightness', 'power']),
      );
    });

    test('returns empty for unknown device', () => {
      expect(store.getDeviceCells('unknown')).toEqual([]);
    });
  });

  describe('sendCellValueUpdate', () => {
    test('sends MQTT message', async () => {

      await store.sendCellValueUpdate('lamp', 'brightness', '100');

      expect(mqttClientMock.send).toHaveBeenCalledWith(
        '/devices/lamp/controls/brightness/on',
        '100',
        false,
      );
    });
  });

  describe('deleteDevice', () => {
    test('sends empty payloads to clear topics', () => {

      seedDevice(store, 'lamp', ['brightness']);

      store.deleteDevice('lamp');

      expect(mqttClientMock.send).toHaveBeenCalled();
      const calls = mqttClientMock.send.mock.calls;
      for (const call of calls) {
        expect(call[1]).toBe('');
      }
    });

    test('does nothing for unknown device', () => {

      store.deleteDevice('unknown');
      expect(mqttClientMock.send).not.toHaveBeenCalled();
    });
  });

  describe('subscribeOnCellValue', () => {
    test('notifies on cell value change and unsubscribes', () => {
      const valueHandler = vi.fn();
      const unsub = store.subscribeOnCellValue(valueHandler);

      seedDevice(store, 'lamp', ['brightness']);
      simulateMessage(store, '/devices/lamp/controls/brightness', '75');

      expect(valueHandler).toHaveBeenCalledWith('lamp/brightness', expect.anything());

      unsub();
      valueHandler.mockClear();
      simulateMessage(store, '/devices/lamp/controls/brightness', '50');
      expect(valueHandler).not.toHaveBeenCalled();
    });
  });

  describe('filteredCells', () => {
    test('returns sorted non-system non-hidden cells', () => {
      seedDevice(store, 'lamp', ['brightness', 'power']);
      seedDevice(store, 'system__wb', ['uptime']);

      const ids = store.filteredCells.map((c) => c.id);
      expect(ids).toContain('lamp/brightness');
      expect(ids).not.toContain('system__wb/uptime');
    });

    test('includes system cells when setting enabled', () => {
      storage.set('show-system-devices', 'yes');
      seedDevice(store, 'system__wb', ['uptime']);

      const ids = store.filteredCells.map((c) => c.id);
      expect(ids).toContain('system__wb/uptime');
    });
  });

  describe('topics', () => {
    test('returns grouped options by device', () => {
      seedDevice(store, 'lamp', ['brightness', 'power']);

      const groups = store.topics;
      expect(groups).toHaveLength(1);
      expect(groups[0].label).toBe('lamp');
      expect((groups[0] as any).options).toHaveLength(2);
    });

    test('skips devices with no visible cells', () => {
      seedDevice(store, 'lamp', []);
      expect(store.topics).toHaveLength(0);
    });
  });

  describe('topicsWithoutSystem', () => {
    test('filters out system__ cell options', () => {
      seedDevice(store, 'system__wb', ['uptime']);
      seedDevice(store, 'lamp', ['on']);

      const groups = store.topicsWithoutSystem;
      const allValues = groups.flatMap((g: any) => g.options.map((o: any) => o.value));
      expect(allValues).not.toContain('system__wb/uptime');
      expect(allValues).toContain('lamp/on');
    });
  });

  describe('MQTT meta handlers', () => {
    test('device meta sets title translations', () => {
      simulateMessage(store, '/devices/lamp/meta', JSON.stringify({ title: { en: 'Lamp' } }));
      expect(store.devices.get('lamp').name).toBe('Lamp');
    });

    test('empty device meta clears explicit and may remove device', () => {
      seedDevice(store, 'lamp', []);
      const device = store.devices.get('lamp');
      device.explicit = true;
      device.cells.clear();

      simulateMessage(store, '/devices/lamp/meta', '');
      expect(store.devices.has('lamp')).toBe(false);
    });

    test('empty meta/name resets name to id', () => {
      seedDevice(store, 'lamp', ['on']);
      simulateMessage(store, '/devices/lamp/meta/name', '');
      expect(store.devices.get('lamp').name).toBe('lamp');
    });

    test('cell meta/name sets cell name', () => {
      seedDevice(store, 'lamp', ['brightness']);
      simulateMessage(store, '/devices/lamp/controls/brightness/meta/name', 'Яркость');
      expect(store.cells.get('lamp/brightness').name).toBe('Яркость');
    });

    test('cell meta/units sets cell units', () => {
      seedDevice(store, 'lamp', ['brightness']);
      simulateMessage(store, '/devices/lamp/controls/brightness/meta/units', '%');
      expect(store.cells.get('lamp/brightness').units).toBe('%');
    });

    test('cell meta/readonly sets readonly flag', () => {
      seedDevice(store, 'lamp', ['brightness']);
      simulateMessage(store, '/devices/lamp/controls/brightness/meta/readonly', '1');
      expect(store.cells.get('lamp/brightness').readOnly).toBe(true);
      simulateMessage(store, '/devices/lamp/controls/brightness/meta/readonly', '0');
      expect(store.cells.get('lamp/brightness').readOnly).toBe(false);
    });

    test('cell meta/readonly ignores invalid values', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      seedDevice(store, 'lamp', ['brightness']);
      simulateMessage(store, '/devices/lamp/controls/brightness/meta/readonly', 'invalid');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('cell meta/writable logs deprecation warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      seedDevice(store, 'lamp', ['brightness']);
      simulateMessage(store, '/devices/lamp/controls/brightness/meta/writable', '1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('meta/writable is not supported'));
      consoleSpy.mockRestore();
    });

    test('cell meta/error sets error', () => {
      seedDevice(store, 'lamp', ['brightness']);
      simulateMessage(store, '/devices/lamp/controls/brightness/meta/error', 'r');
      expect(store.cells.get('lamp/brightness').error).toEqual(['r']);
    });

    test('cell meta/min and meta/max set range', () => {
      seedDevice(store, 'lamp', ['brightness']);
      simulateMessage(store, '/devices/lamp/controls/brightness/meta/min', '0');
      simulateMessage(store, '/devices/lamp/controls/brightness/meta/max', '100');
      expect(store.cells.get('lamp/brightness').min).toBe(0);
      expect(store.cells.get('lamp/brightness').max).toBe(100);
    });

    test('cell meta/precision sets step', () => {
      seedDevice(store, 'lamp', ['brightness']);
      simulateMessage(store, '/devices/lamp/controls/brightness/meta/precision', '0.1');
      expect(store.cells.get('lamp/brightness').step).toBe(0.1);
    });

    test('cell meta/order sets order', () => {
      seedDevice(store, 'lamp', ['brightness']);
      simulateMessage(store, '/devices/lamp/controls/brightness/meta/order', '5');
      expect(store.cells.get('lamp/brightness').order).toBe(5);
    });

    test('cell meta JSON sets multiple properties', () => {
      seedDevice(store, 'lamp', ['brightness']);
      simulateMessage(store, '/devices/lamp/controls/brightness/meta', JSON.stringify({
        type: 'range',
        min: 0,
        max: 255,
        readonly: false,
      }));
      const cell = store.cells.get('lamp/brightness');
      expect(cell.type).toBe('range');
      expect(cell.min).toBe(0);
      expect(cell.max).toBe(255);
    });

    test('empty cell meta removes cell from device', () => {
      seedDevice(store, 'lamp', ['brightness']);
      simulateMessage(store, '/devices/lamp/controls/brightness/meta', '');
      expect(store.devices.get('lamp').cells.has('lamp/brightness')).toBe(false);
    });
  });

  describe('toggleDevices', () => {
    test('toggles visibility of all filtered devices', () => {
      seedDevice(store, 'lamp', ['on']);
      seedDevice(store, 'fan', ['on']);

      expect(store.hasOpenedDivices).toBe(true);

      store.toggleDevices();
      expect(store.hasOpenedDivices).toBe(false);

      store.toggleDevices();
      expect(store.hasOpenedDivices).toBe(true);
    });
  });
});
