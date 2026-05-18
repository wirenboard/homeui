import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/input';
import { Range } from '@/components/range';
import { Switch } from '@/components/switch';
import { DALI_TC_MASK_VALUE } from '@/utils/dali-color-temperature';
import type { DaliColorTemperatureSliderEditorProps } from './types';

export const DaliColorTemperatureSliderEditor = observer(({
  store,
  inputId,
}: DaliColorTemperatureSliderEditorProps) => {
  const { t } = useTranslation();
  const value = typeof store.value === 'number' ? store.value : 0;
  const minValue = store.schema.options?.wb?.dali_tc?.minimum ?? 1;
  const maxValue = store.schema.options?.wb?.dali_tc?.maximum ?? (DALI_TC_MASK_VALUE - 1);
  const isMasked = value === DALI_TC_MASK_VALUE;
  const isDisabled = !!store.schema.options?.wb?.read_only;
  const hasErrors = !isMasked && store.hasErrors;

  const onSwitchChange = useCallback((enabled: boolean) => {
    store.setValue(enabled ? maxValue : DALI_TC_MASK_VALUE);
  }, [maxValue]);

  const onSliderChange = useCallback((val: number) => {
    store.setValue(val);
  }, []);

  const onKelvinChange = useCallback((val: string | number) => {
    store.setEditString(String(val));
  }, []);

  const onKelvinCommit = useCallback(() => {
    if (store.hasErrors || typeof store.value !== 'number') {
      return;
    }
    // Re-derive editString from canonical K — gives the "snap" (4500 → 4505).
    store.setValue(store.value);
  }, []);

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
            value={value}
            min={minValue}
            max={maxValue}
            step={1}
            isDisabled={isDisabled}
            isInvalid={hasErrors}
            labelPosition="none"
            onChange={onSliderChange}
          />
          <Input
            className={classNames('dali-color-temperature-slider-input', {
              'wb-jsonEditor-propertyInputError': hasErrors,
            })}
            value={store.editString}
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
