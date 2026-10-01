// @vitest-environment happy-dom
import { Capability, Color, ColorModel } from '@/stores/alice';
import {
  getAvailableModeInstances,
  getAvailableRangeInstances,
  getAvailableToggleInstances,
  getAvailableColorModels,
  getCurrentColorModel,
  getColorModelLabel,
  RANGE_LIMITS_DEFAULT,
  RANGE_LIMITS_LOCKED,
} from './helpers';

function cap(type: string, params: any = {}) {
  return { type, mqtt: '', parameters: params } as any;
}

describe('helpers', () => {
  describe('getAvailableModeInstances', () => {
    test('returns all instances when none used', () => {
      const result = getAvailableModeInstances([]);
      expect(result).toHaveLength(12);
      expect(result).toContain('fan_speed');
    });

    test('excludes used instances', () => {
      const caps = [cap(Capability.Mode, { instance: 'fan_speed' })];
      const result = getAvailableModeInstances(caps);
      expect(result).not.toContain('fan_speed');
    });

    test('excludeIndex skips capability at that index', () => {
      const caps = [cap(Capability.Mode, { instance: 'fan_speed' })];
      const result = getAvailableModeInstances(caps, 0);
      expect(result).toContain('fan_speed');
    });

    test('ignores non-mode capabilities', () => {
      const caps = [cap(Capability.Range, { instance: 'fan_speed' })];
      const result = getAvailableModeInstances(caps);
      expect(result).toContain('fan_speed');
    });
  });

  describe('getAvailableRangeInstances', () => {
    test('returns all 6 instances when none used', () => {
      expect(getAvailableRangeInstances([])).toHaveLength(6);
    });

    test('excludes used range instances', () => {
      const caps = [cap(Capability.Range, { instance: 'brightness' })];
      expect(getAvailableRangeInstances(caps)).not.toContain('brightness');
    });

    test('excludeIndex allows reselection', () => {
      const caps = [cap(Capability.Range, { instance: 'brightness' })];
      expect(getAvailableRangeInstances(caps, 0)).toContain('brightness');
    });
  });

  describe('getAvailableToggleInstances', () => {
    test('returns all 7 instances when none used', () => {
      expect(getAvailableToggleInstances([])).toHaveLength(7);
    });

    test('excludes used toggle instances', () => {
      const caps = [cap(Capability.Toggle, { instance: 'mute' })];
      expect(getAvailableToggleInstances(caps)).not.toContain('mute');
    });
  });

  describe('getAvailableColorModels', () => {
    test('returns ColorModel and TemperatureK (ColorScene disabled)', () => {
      const result = getAvailableColorModels([]);
      expect(result).toContain(Color.ColorModel);
      expect(result).toContain(Color.TemperatureK);
      expect(result).not.toContain(Color.ColorScene);
    });

    test('excludes used color model', () => {
      const caps = [
        cap(Capability['Color setting'], { color_model: ColorModel.RGB }),
      ];
      const result = getAvailableColorModels(caps);
      expect(result).not.toContain(Color.ColorModel);
      expect(result).toContain(Color.TemperatureK);
    });

    test('excludes used temperature_k', () => {
      const caps = [
        cap(Capability['Color setting'], { temperature_k: { min: 2700, max: 6500 } }),
      ];
      expect(getAvailableColorModels(caps)).not.toContain(Color.TemperatureK);
    });

    test('excludeIndex allows reselection', () => {
      const caps = [
        cap(Capability['Color setting'], { color_model: ColorModel.RGB }),
      ];
      expect(getAvailableColorModels(caps, 0)).toContain(Color.ColorModel);
    });
  });

  describe('getCurrentColorModel', () => {
    test('returns ColorModel for color_model param', () => {
      expect(getCurrentColorModel(cap('', { color_model: 'rgb' }))).toBe(Color.ColorModel);
    });

    test('returns TemperatureK for temperature_k param', () => {
      expect(getCurrentColorModel(cap('', { temperature_k: {} }))).toBe(Color.TemperatureK);
    });

    test('returns ColorScene for color_scene param', () => {
      expect(getCurrentColorModel(cap('', { color_scene: {} }))).toBe(Color.ColorScene);
    });

    test('defaults to ColorModel when no params', () => {
      expect(getCurrentColorModel(cap('', {}))).toBe(Color.ColorModel);
    });
  });

  describe('getColorModelLabel', () => {
    const t = (k: string) => k;

    test('returns label for ColorModel', () => {
      expect(getColorModelLabel('ColorModel', t)).toBe('alice.labels.color-model');
    });

    test('returns label for TemperatureK', () => {
      expect(getColorModelLabel('TemperatureK', t)).toBe('alice.labels.color-temperature');
    });

    test('returns label for ColorScene', () => {
      expect(getColorModelLabel('ColorScene', t)).toBe('alice.labels.color-scenes');
    });

    test('returns key as-is for unknown', () => {
      expect(getColorModelLabel('unknown', t)).toBe('unknown');
    });
  });

  describe('constants', () => {
    test('RANGE_LIMITS_DEFAULT has expected values', () => {
      expect(RANGE_LIMITS_DEFAULT).toEqual({ min: 0, max: 100, precision: 1 });
    });

    test('RANGE_LIMITS_LOCKED contains brightness, humidity, open', () => {
      expect(RANGE_LIMITS_LOCKED.brightness).toBeDefined();
      expect(RANGE_LIMITS_LOCKED.humidity).toBeDefined();
      expect(RANGE_LIMITS_LOCKED.open).toBeDefined();
      expect(RANGE_LIMITS_LOCKED.channel).toBeUndefined();
      expect(RANGE_LIMITS_LOCKED.temperature).toBeUndefined();
    });
  });
});
