import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/input';
import { Range } from '@/components/range';
import { Switch } from '@/components/switch';
import { NumberStore, type ObjectStore, type PropertyStore } from '@/stores/json-schema-editor';
import {
  DALI_TC_MASK_VALUE,
  TC_SLIDER_STEP_K,
  UI_MAX_TC_MIREK,
  UI_MIN_TC_MIREK,
  kelvinToMirek,
  mirekToKelvin,
  snapKelvinTo100,
} from '@/utils/dali-color-temperature';
import type { DaliColorTemperatureSliderEditorProps } from './types';

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

const usableMirek = (value: unknown): number | undefined =>
  typeof value === 'number' && value !== DALI_TC_MASK_VALUE ? value : undefined;

// Resolve a dotted path (e.g. 'tc_limits.tc_coolest') to a limit mirek, or undefined.
const resolveLimitMirek = (rootStore: PropertyStore | undefined, path?: string): number | undefined => {
  if (!path || !rootStore) {
    return undefined;
  }
  let store: PropertyStore | undefined = rootStore;
  for (const key of path.split('.')) {
    if (store?.storeType !== 'object') {
      return undefined;
    }
    store = (store as ObjectStore).getParamByKey(key)?.store;
  }
  return usableMirek(store instanceof NumberStore ? store.value : undefined);
};

// Bounds (mirek): live limit → static bound → UI range; ordered to never invert.
const tcSliderBounds = (store: NumberStore, rootStore?: PropertyStore) => {
  const dali = store.schema.options?.wb?.dali_tc;
  const min = resolveLimitMirek(rootStore, dali?.min_limit)
    ?? (typeof dali?.minimum === 'number' ? dali.minimum : undefined)
    ?? UI_MIN_TC_MIREK;
  const max = resolveLimitMirek(rootStore, dali?.max_limit)
    ?? (typeof dali?.maximum === 'number' ? dali.maximum : undefined)
    ?? UI_MAX_TC_MIREK;
  return { min: Math.min(min, max), max: Math.max(min, max) };
};

// Kelvin grid bounds, rounded *outward* so any value's nearest-100 snap stays in
// range (thumb and field agree); out-of-range is still clamped on commit.
const kelvinSliderBounds = (minMirek: number, maxMirek: number) => {
  const warmK = mirekToKelvin(maxMirek);
  const coolK = mirekToKelvin(minMirek);
  const kMin = Math.floor(warmK / TC_SLIDER_STEP_K) * TC_SLIDER_STEP_K;
  const kMax = Math.ceil(coolK / TC_SLIDER_STEP_K) * TC_SLIDER_STEP_K;
  return { kMin, kMax };
};

export const DaliColorTemperatureSliderEditor = observer(({
  store,
  inputId,
  rootStore,
}: DaliColorTemperatureSliderEditorProps) => {
  const { t } = useTranslation();
  const value = typeof store.value === 'number' ? store.value : 0;
  const { min: minMirek, max: maxMirek } = tcSliderBounds(store, rootStore);
  const { kMin, kMax } = kelvinSliderBounds(minMirek, maxMirek);
  // Reflect the track (kSpan − K) so the cool end (high K) stays on the left.
  const kSpan = kMin + kMax;
  const displayKelvin = clamp(snapKelvinTo100(mirekToKelvin(value)), kMin, kMax);
  const sliderPos = kSpan - displayKelvin;
  // Live drag readout; null = not dragging (field shows editString).
  const [dragKelvin, setDragKelvin] = useState<number | null>(null);
  const isMasked = value === DALI_TC_MASK_VALUE;
  const isDisabled = !!store.schema.options?.wb?.read_only;
  const hasErrors = !isMasked && store.hasErrors;

  // Re-clamp when limits narrow; skip the first run so loading doesn't dirty the form.
  const prevBounds = useRef<{ min: number; max: number } | null>(null);
  useEffect(() => {
    const isInitial = prevBounds.current === null;
    prevBounds.current = { min: minMirek, max: maxMirek };
    if (isInitial || typeof store.value !== 'number' || store.value === DALI_TC_MASK_VALUE) {
      return;
    }
    const clamped = clamp(store.value, minMirek, maxMirek);
    if (clamped !== store.value) {
      store.setValue(clamped);
    }
  }, [minMirek, maxMirek, store]);

  const onSwitchChange = useCallback((enabled: boolean) => {
    store.setValue(enabled ? maxMirek : DALI_TC_MASK_VALUE);
  }, [maxMirek, store]);

  const onSliderLive = useCallback((pos: number) => {
    const mirek = clamp(kelvinToMirek(kMin + kMax - pos), minMirek, maxMirek);
    setDragKelvin(snapKelvinTo100(mirekToKelvin(mirek)));
  }, [kMin, kMax, minMirek, maxMirek]);

  const onSliderChange = useCallback((pos: number) => {
    const kelvin = kMin + kMax - pos;
    if (String(kelvin) !== store.editString) {
      store.setValue(clamp(kelvinToMirek(kelvin), minMirek, maxMirek));
    }
    setDragKelvin(null);
  }, [kMin, kMax, minMirek, maxMirek, store]);

  const onKelvinChange = useCallback((val: string | number) => {
    store.setEditString(String(val));
  }, [store]);

  const onKelvinCommit = useCallback(() => {
    if (typeof store.value !== 'number') {
      return;
    }
    // Snap the typed K to the grid (4530 → 4500). Skip if the field already shows it,
    // so focus+blur can't drift the mirek and dirty the form.
    const snappedK = clamp(snapKelvinTo100(mirekToKelvin(store.value)), kMin, kMax);
    if (String(snappedK) !== store.editString) {
      store.setValue(clamp(kelvinToMirek(snappedK), minMirek, maxMirek));
    }
  }, [kMin, kMax, minMirek, maxMirek, store]);

  return (
    <div className="dali-color-temperature-slider">
      <Switch
        value={!isMasked}
        isDisabled={isDisabled}
        onChange={onSwitchChange}
      />
      {isMasked ? (
        <span className="dali-color-temperature-slider-mask">
          {t(store.schema.options?.wb?.dali_tc?.mode === 'limit'
            ? 'json-editor.labels.dali-mask-tc-limit-not-set'
            : 'json-editor.labels.dali-mask')}
        </span>
      ) : (
        <>
          <Range
            id={inputId ?? ''}
            value={sliderPos}
            min={kMin}
            max={kMax}
            step={TC_SLIDER_STEP_K}
            isDisabled={isDisabled}
            isInvalid={hasErrors}
            labelPosition="none"
            onChange={onSliderChange}
            onLiveChange={onSliderLive}
          />
          <Input
            className={classNames('dali-color-temperature-slider-input', {
              'wb-jsonEditor-propertyInputError': hasErrors,
            })}
            value={dragKelvin !== null ? String(dragKelvin) : store.editString}
            isDisabled={isDisabled}
            ariaLabel="Kelvin"
            ariaInvalid={hasErrors}
            onChange={onKelvinChange}
            onBlur={onKelvinCommit}
            onEnter={onKelvinCommit}
          />
          <span className="dali-color-temperature-slider-input-suffix">K</span>
        </>
      )}
    </div>
  );
});

export default DaliColorTemperatureSliderEditor;
