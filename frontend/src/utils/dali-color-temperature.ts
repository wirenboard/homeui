import type { ValidationError } from '@/stores/json-schema-editor';

export const DALI_TC_FORMAT = 'dali-tc';
export const DALI_TC_MASK_VALUE = 65535;

// mirek = 1_000_000 / Kelvin (and vice versa) — the conversion is symmetric.
// Aliased for readable call sites that document the direction.
const reciprocalMillion = (n: number): number => (n <= 0 ? 0 : Math.round(1_000_000 / n));

export const mirekToKelvin = reciprocalMillion;
export const kelvinToMirek = reciprocalMillion;

// Default to 10 K granularity, but the mirek that lies closest to each
// multiple of 100 is promoted to show that 100-multiple exactly. This keeps
// every multiple of 100 in [1000, 10000] reachable while letting every other
// slider position keep its natural 10 K rounding.
const roundKelvinForDisplay = (k: number): number => {
  if (k < 1000) return k;
  const hundred = Math.round(k / 100) * 100;
  if (kelvinToMirek(hundred) === kelvinToMirek(k)) return hundred;
  return Math.round(k / 10) * 10;
};

export const formatKelvinEditString = (mirek: number): string =>
  mirek === DALI_TC_MASK_VALUE ? '' : String(roundKelvinForDisplay(mirekToKelvin(mirek)));

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
        min: roundKelvinForDisplay(mirekToKelvin(maxMirek)),
        max: roundKelvinForDisplay(mirekToKelvin(minMirek)),
      },
    };
  }
  return undefined;
};
