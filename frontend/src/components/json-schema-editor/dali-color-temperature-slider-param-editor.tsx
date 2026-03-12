import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Range } from '@/components/range';
import { Switch } from '@/components/switch';
import type { DaliColorTemperatureSliderEditorProps } from './types';

// Convert mirek (DALI color temperature unit) to Kelvin
// K = round(1_000_000 / mirek)
const mirekToKelvin = (mirek: number): number => {
  if (mirek <= 0) {
    return 0;
  }
  return Math.round(1_000_000 / mirek);
};

const formatKelvin = (mirek: number): string => {
  return `${mirekToKelvin(mirek)} K`;
};

const MASK_VALUE = 65535;

export const DaliColorTemperatureSliderEditor = observer(({
  store,
  inputId,
}: DaliColorTemperatureSliderEditorProps) => {
  const { t } = useTranslation();
  const value = typeof store.value === 'number' ? store.value : 0;
  const minValue = store.schema.minimum ?? 1;
  const maxValue = store.schema.maximum ?? (MASK_VALUE - 1);
  const isMasked = value === MASK_VALUE;
  const isDisabled = !!store.schema.options?.wb?.read_only;

  const onSwitchChange = useCallback((enabled: boolean) => {
    store.setValue(enabled ? minValue : MASK_VALUE);
  }, [store, minValue]);

  const onSliderChange = useCallback((val: number) => {
    store.setValue(val);
  }, [store]);

  return (
    <div className="dali-color-temperature-slider">
      <Switch
        value={!isMasked}
        isDisabled={isDisabled}
        onChange={onSwitchChange}
      />
      {isMasked ? (
        <span className="dali-color-temperature-slider-mask">{t('json-editor.labels.dali-mask')}</span>
      ) : (
        <Range
          id={inputId ?? ''}
          value={value}
          min={minValue}
          max={maxValue}
          step={1}
          isDisabled={isDisabled}
          isInvalid={store.hasErrors}
          labelPosition="right"
          formatLabel={formatKelvin}
          onChange={onSliderChange}
        />
      )}
    </div>
  );
});

export default DaliColorTemperatureSliderEditor;
