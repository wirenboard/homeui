import Cell from './cell';

const i18nMock = vi.hoisted(() => ({ language: 'en' }));
vi.mock('@/i18n/config', () => ({ default: i18nMock }));
vi.mock('@/utils/color', () => ({
  hexToRgb: vi.fn((hex: string) => hex),
  isHex: vi.fn((v: string) => /^#[0-9a-f]{6}$/i.test(v)),
  rgbToHex: vi.fn((r: string, g: string, b: string) => `#${r}${g}${b}`),
}));

describe('Cell', () => {
  const sendMock = vi.fn();
  let cell: Cell;

  beforeEach(() => {
    vi.clearAllMocks();
    cell = new Cell('device1/brightness', sendMock);
  });

  describe('constructor', () => {
    test('parses deviceId and controlId from id', () => {
      expect(cell.deviceId).toBe('device1');
      expect(cell.controlId).toBe('brightness');
    });

    test('throws on invalid id without slash', () => {
      expect(() => new Cell('invalid', sendMock)).toThrow('Invalid cell id');
    });

    test('defaults to incomplete type', () => {
      expect(cell.type).toBe('incomplete');
    });
  });

  describe('setType', () => {
    test('sets known type', () => {
      cell.setType('switch');
      expect(cell.type).toBe('switch');
    });

    test('sets incomplete when empty', () => {
      cell.setType('switch');
      cell.setType('' as any);
      expect(cell.type).toBe('incomplete');
    });

    test('infers value type for numeric unknown types', () => {
      cell.receiveValue('42');
      cell.setType('unknown_numeric' as any);
      expect(cell.type).toBe('value');
    });
  });

  describe('receiveValue', () => {
    test('stores string value for text type', () => {
      cell.setType('text');
      cell.receiveValue('hello');
      expect(cell.value).toBe('hello');
    });

    test('converts to number for value type', () => {
      cell.setType('value');
      cell.receiveValue('42.5');
      expect(cell.value).toBe(42.5);
    });

    test('converts to boolean for switch type', () => {
      cell.setType('switch');
      cell.receiveValue('1');
      expect(cell.value).toBe(true);
      cell.receiveValue('0');
      expect(cell.value).toBe(false);
    });
  });

  describe('setters', () => {
    test('setName', () => {
      cell.setName('Brightness');
      expect(cell.name).toBe('Brightness');
    });

    test('setUnits', () => {
      cell.setType('value');
      cell.setUnits('%');
      expect(cell.units).toBe('%');
    });

    test('setReadOnly', () => {
      cell.setReadOnly(true);
      expect(cell.readOnly).toBe(true);
      cell.setReadOnly(null);
      expect(cell.readOnly).toBe(true); // falls back to type default
    });

    test('setMin / setMax / setStep / setOrder', () => {
      cell.setMin('0');
      cell.setMax('100');
      cell.setStep('5');
      cell.setOrder('3');
      expect(cell.min).toBe(0);
      expect(cell.max).toBe(100);
      expect(cell.step).toBe(5);
      expect(cell.order).toBe(3);
    });

    test('setError', () => {
      cell.setError('rw');
      expect(cell.error).toEqual(['r', 'w']);
      cell.setError('');
      expect(cell.error).toBeNull();
    });
  });

  describe('setMeta', () => {
    test('applies meta properties', () => {
      cell.setMeta(JSON.stringify({
        type: 'range',
        title: { en: 'Brightness' },
        min: 0,
        max: 255,
        readonly: false,
        units: '%',
        order: 1,
      }));

      expect(cell.type).toBe('range');
      expect(cell.name).toBe('Brightness');
      expect(cell.min).toBe(0);
      expect(cell.max).toBe(255);
      expect(cell.readOnly).toBe(false);
      expect(cell.units).toBe('%');
      expect(cell.order).toBe(1);
    });

    test('handles invalid JSON', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      cell.setMeta('bad-json');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('sets hidden flag', () => {
      cell.setMeta(JSON.stringify({ hidden: true }));
      expect(cell.hidden).toBe(true);
    });
  });

  describe('isComplete', () => {
    test('false when incomplete', () => {
      expect(cell.isComplete).toBe(false);
    });

    test('true when type is set and value received', () => {
      cell.setType('switch');
      cell.receiveValue('1');
      expect(cell.isComplete).toBe(true);
    });

    test('true for pushbutton even without value', () => {
      cell.setType('pushbutton');
      expect(cell.isComplete).toBe(true);
    });
  });

  describe('isSystem', () => {
    test('true for system__ prefix', () => {
      const c = new Cell('system__wb/uptime', sendMock);
      expect(c.isSystem).toBe(true);
    });

    test('false for normal cell', () => {
      expect(cell.isSystem).toBe(false);
    });
  });

  describe('topic', () => {
    test('returns MQTT topic path', () => {
      expect(cell.topic).toBe('/devices/device1/controls/brightness');
    });
  });

  describe('getStringifiedValue', () => {
    test('returns "1"/"0" for boolean', () => {
      cell.setType('switch');
      cell.receiveValue('1');
      expect(cell.getStringifiedValue()).toBe('1');
      cell.receiveValue('0');
      expect(cell.getStringifiedValue()).toBe('0');
    });

    test('returns "1" for pushbutton', () => {
      cell.setType('pushbutton');
      expect(cell.getStringifiedValue()).toBe('1');
    });

    test('returns string for default types', () => {
      cell.setType('value');
      cell.receiveValue('42');
      expect(cell.getStringifiedValue()).toBe('42');
    });
  });

  describe('displayType', () => {
    test('returns display type from cell type entry', () => {
      cell.setType('switch');
      expect(cell.displayType).toBe('switch');
    });
  });

  describe('value setter', () => {
    test('sends value update for writable complete cell', async () => {
      cell.setType('range');
      cell.setReadOnly(false);
      cell.receiveValue('50');

      cell.value = 75;

      await vi.waitFor(() => {
        expect(sendMock).toHaveBeenCalledWith('device1', 'brightness', '75');
      });
    });

    test('does nothing for readonly cell', () => {
      cell.setType('text');
      cell.receiveValue('hello');

      cell.value = 'new';
      expect(sendMock).not.toHaveBeenCalled();
    });

    test('does nothing for incomplete cell', () => {
      cell.value = 'test';
      expect(sendMock).not.toHaveBeenCalled();
    });

    test('ignores empty string for non-string types', async () => {
      cell.setType('range');
      cell.setReadOnly(false);
      cell.receiveValue('50');

      cell.value = '';

      await vi.waitFor(() => {
        expect(sendMock).toHaveBeenCalledWith('device1', 'brightness', '50');
      });
    });
  });

  describe('setType edge cases', () => {
    test('does not infer value for non-numeric unknown types', () => {
      cell.receiveValue('hello');
      cell.setType('custom_text' as any);
      expect(cell.type).not.toBe('value');
    });

    test('re-applies value after setting known type', () => {
      cell.setType('text');
      cell.receiveValue('hello');
      cell.setType('text');
      expect(cell.value).toBe('hello');
    });
  });

  describe('_setCellValue branches', () => {
    test('unixtime stores value or defaults to 0', () => {
      cell.setType('unixtime');
      cell.receiveValue('1700000000');
      expect(cell.value).toBe('1700000000');
      cell.receiveValue('');
      expect(cell.value).toBe(0);
    });

    test('number defaults to 0 for NaN', () => {
      cell.setType('value');
      cell.receiveValue('not-a-number');
      expect(cell.value).toBe(0);
    });

    test('rgb stores hex value', () => {
      cell.setType('rgb');
      cell.receiveValue('#ff0000');
      expect(cell.value).toBe('#ff0000');
    });

    test('rgb converts semicolon format', () => {
      cell.setType('rgb');
      cell.receiveValue('255;0;0');
      expect(cell.value).toBe('#25500');
    });

    test('rgb stores null for empty value', () => {
      cell.setType('rgb');
      cell.receiveValue('');
      expect(cell.value).toBeNull();
    });

    test('rgb stores null for invalid format', () => {
      cell.setType('rgb');
      cell.receiveValue('invalid-color');
      expect(cell.value).toBeNull();
    });

    test('text stores empty string for falsy value', () => {
      cell.setType('text');
      cell.receiveValue('');
      expect(cell.value).toBe('');
    });
  });

  describe('getStringifiedValue rgb', () => {
    test('returns hex for rgb type', () => {
      cell.setType('rgb');
      cell.receiveValue('#aabbcc');
      expect(cell.getStringifiedValue()).toBe('#aabbcc');
    });
  });

  describe('setMeta additional branches', () => {
    test('applies precision, error, and enum', () => {
      cell.setMeta(JSON.stringify({
        precision: 0.5,
        error: 'rw',
        enum: { 0: { en: 'Off' } },
      }));
      expect(cell.step).toBe(0.5);
      expect(cell.error).toEqual(['r', 'w']);
      expect(cell.isEnum).toBe(true);
    });
  });

  describe('getEnumName', () => {
    test('returns translated name for current language', () => {
      cell.setMeta(JSON.stringify({ enum: { 1: { en: 'On', ru: 'Вкл' } } }));
      expect(cell.getEnumName('1')).toBe('On');
    });

    test('falls back to en when current language missing', () => {
      i18nMock.language = 'fr';
      cell.setMeta(JSON.stringify({ enum: { 1: { en: 'On' } } }));
      expect(cell.getEnumName('1')).toBe('On');
      i18nMock.language = 'en';
    });

    test('returns raw value when no translation', () => {
      cell.setMeta(JSON.stringify({ enum: { 1: {} } }));
      expect(cell.getEnumName('1')).toBe('1');
    });

    test('returns raw value when enum key missing', () => {
      expect(cell.getEnumName('unknown')).toBe('unknown');
    });
  });

  describe('enumValues', () => {
    test('returns enum options from meta', () => {
      cell.setType('value');
      cell.setMeta(JSON.stringify({
        enum: { 0: { en: 'Off' }, 1: { en: 'On' } },
      }));

      expect(cell.isEnum).toBe(true);
      expect(cell.enumValues).toEqual([
        { name: 'Off', value: 0 },
        { name: 'On', value: 1 },
      ]);
    });
  });
});
