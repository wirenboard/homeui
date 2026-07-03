import type { ValidationError } from '@/stores/json-schema-editor';

export const DALI_TC_FORMAT = 'dali-tc';
export const DALI_TC_MASK_VALUE = 65535;

// mirek = 1_000_000 / Kelvin (and vice versa) — the conversion is symmetric.
// Aliased for readable call sites that document the direction.
const reciprocalMillion = (n: number): number => (n <= 0 ? 0 : Math.round(1_000_000 / n));

export const mirekToKelvin = reciprocalMillion;
export const kelvinToMirek = reciprocalMillion;

// Fallback colour-temperature span when a device has no usable physical limit.
export const UI_MIN_TC_K = 1000;
export const UI_MAX_TC_K = 10000;
export const UI_MIN_TC_MIREK = kelvinToMirek(UI_MAX_TC_K);
export const UI_MAX_TC_MIREK = kelvinToMirek(UI_MIN_TC_K);

// 100 K grid — the finest step where every position round-trips to a distinct mirek
export const TC_SLIDER_STEP_K = 100;
export const snapKelvinTo100 = (k: number): number =>
  Math.round(k / TC_SLIDER_STEP_K) * TC_SLIDER_STEP_K;

export const formatKelvinEditString = (mirek: number): string =>
  mirek === DALI_TC_MASK_VALUE ? '' : String(snapKelvinTo100(mirekToKelvin(mirek)));

// Validates a user-entered K text against [minMirek, maxMirek] mirek bounds.
// Validation happens in mirek-space so the device-side range is respected even
// when the typed K rounds to a value just outside the displayed bounds.
export const validateKelvinEditString = (
  editString: string,
  minMirek: number,
  maxMirek: number,
): ValidationError | undefined => {
  const trimmed = editString.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { key: 'json-editor.errors.not-an-integer' };
  }
  const k = parseInt(trimmed, 10);
  const m = kelvinToMirek(k);
  if (m < minMirek || m > maxMirek) {
    return {
      key: 'json-editor.errors.minmax',
      data: {
        min: snapKelvinTo100(mirekToKelvin(maxMirek)),
        max: snapKelvinTo100(mirekToKelvin(minMirek)),
      },
    };
  }
  return undefined;
};
