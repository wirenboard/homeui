import type { ValidationError } from '@/stores/json-schema-editor';

export const DALI_TC_FORMAT = 'dali-tc';
export const DALI_TC_MASK_VALUE = 65535;

// mirek = 1_000_000 / Kelvin (and vice versa) — the conversion is symmetric.
// Aliased for readable call sites that document the direction.
const reciprocalMillion = (n: number): number => (n <= 0 ? 0 : Math.round(1_000_000 / n));

export const mirekToKelvin = reciprocalMillion;
export const kelvinToMirek = reciprocalMillion;

// Format a mirek value for the user-facing input. MASK is shown as an empty
// string (the editor hides the input in masked state anyway).
export const formatKelvinEditString = (mirek: number): string =>
  mirek === DALI_TC_MASK_VALUE ? '' : String(mirekToKelvin(mirek));

// Validates a user-entered K text against [minMirek, maxMirek] mirek bounds.
// The bounds are converted to K internally so the message data is in K.
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
  const minK = mirekToKelvin(maxMirek);
  const maxK = mirekToKelvin(minMirek);
  if (k < minK || k > maxK) {
    return { key: 'json-editor.errors.minmax', data: { min: minK, max: maxK } };
  }
  return undefined;
};
