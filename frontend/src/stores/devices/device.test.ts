import Device from './device';

vi.mock('@/i18n/config', () => ({ default: { language: 'en' } }));

const getItemMock = vi.fn();
const setItemMock = vi.fn();
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: getItemMock, setItem: setItemMock },
});

describe('Device', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getItemMock.mockReturnValue(null);
  });

  describe('constructor', () => {
    test('sets id and defaults', () => {
      const d = new Device('lamp');
      expect(d.id).toBe('lamp');
      expect(d.isVisible).toBe(true);
      expect(d.explicit).toBe(false);
      expect(d.cells.size).toBe(0);
    });

    test('reads folded state from localStorage', () => {
      getItemMock.mockReturnValue(JSON.stringify(['lamp']));
      const d = new Device('lamp');
      expect(d.isVisible).toBe(false);
    });
  });

  describe('name', () => {
    test('falls back to id when no name set', () => {
      const d = new Device('lamp');
      expect(d.name).toBe('lamp');
    });

    test('returns set name', () => {
      const d = new Device('lamp');
      d.name = 'My Lamp';
      expect(d.name).toBe('My Lamp');
    });

    test('prefers translation from meta', () => {
      const d = new Device('lamp');
      d.setMeta(JSON.stringify({ title: { en: 'English Lamp', ru: 'Лампа' } }));
      expect(d.name).toBe('English Lamp');
    });
  });

  describe('setMeta', () => {
    test('handles invalid JSON', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const d = new Device('lamp');
      d.setMeta('not-json');
      expect(d.name).toBe('lamp');
      consoleSpy.mockRestore();
    });
  });

  describe('cells', () => {
    test('addCell / removeCell', () => {
      const d = new Device('lamp');
      d.addCell('lamp/brightness');
      expect(d.cells.has('lamp/brightness')).toBe(true);
      d.removeCell('lamp/brightness');
      expect(d.cells.has('lamp/brightness')).toBe(false);
    });
  });

  describe('isServiceDevice', () => {
    test('returns true for system__ prefix', () => {
      expect(new Device('system__wb').isServiceDevice).toBe(true);
    });

    test('returns false for normal device', () => {
      expect(new Device('lamp').isServiceDevice).toBe(false);
    });
  });

  describe('toggleDeviceVisibility', () => {
    test('folds visible device', () => {
      getItemMock.mockReturnValue(JSON.stringify([]));
      const d = new Device('lamp');

      d.toggleDeviceVisibility();

      expect(d.isVisible).toBe(false);
      expect(setItemMock).toHaveBeenCalledWith(
        'foldedDevices',
        expect.stringContaining('lamp'),
      );
    });

    test('unfolds folded device', () => {
      getItemMock.mockReturnValue(JSON.stringify(['lamp']));
      const d = new Device('lamp');
      expect(d.isVisible).toBe(false);

      getItemMock.mockReturnValue(JSON.stringify(['lamp']));
      d.toggleDeviceVisibility();

      expect(d.isVisible).toBe(true);
    });
  });

  describe('getControls', () => {
    test('returns control ids without device prefix', () => {
      const d = new Device('lamp');
      d.addCell('lamp/brightness');
      d.addCell('lamp/power');
      expect(d.getControls()).toEqual(expect.arrayContaining(['brightness', 'power']));
    });
  });
});
