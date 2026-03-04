import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Range } from '@/components/range';
import { Switch } from '@/components/switch';
import { type ObjectStore } from '@/stores/json-schema-editor';
import type { DaliLevelSliderEditorProps } from './types';

// IEC 62386-102: DALI logarithmic dimming curve
// Level 0 = OFF, levels 1-254: output(%) = 10^((level - 1) * 3 / 253 - 1)
const logPercent = (level: number): number => {
  if (level <= 0) {
    return 0;
  }
  if (level >= 254) {
    return 100;
  }
  return Math.pow(10, ((level - 1) * 3) / 253 - 1);
};

const linearPercent = (level: number): number => {
  if (level <= 0) {
    return 0;
  }
  if (level >= 254) {
    return 100;
  }
  return (level / 254) * 100;
};

const formatPercent = (percent: number): string => {
  return `${parseFloat(percent.toFixed(3))}%`;
};

const getDimmingCurve = (rootStore: DaliLevelSliderEditorProps['rootStore']): number => {
  if (rootStore.storeType !== 'object') {
    return 0;
  }
  const param = (rootStore as ObjectStore).getParamByKey('dimming_curve');
  if (!param) {
    return 0;
  }
  const val = param.store.value;
  return typeof val === 'number' ? val : 0;
};

const MASK_VALUE = 255;

const DaliLevelSliderEditor = observer(({
  store,
  rootStore,
  inputId,
}: DaliLevelSliderEditorProps) => {
  const { t } = useTranslation();
  const value = typeof store.value === 'number' ? store.value : 0;
  const isMasked = value === MASK_VALUE;
  const isDisabled = !!store.schema.options?.wb?.read_only;
  const dimmingCurve = getDimmingCurve(rootStore);

  const formatLabel = useCallback((level: number): string => {
    const percent = dimmingCurve === 1 ? linearPercent(level) : logPercent(level);
    return formatPercent(percent);
  }, [dimmingCurve]);

  const onSwitchChange = useCallback((enabled: boolean) => {
    store.setValue(enabled ? 0 : MASK_VALUE);
  }, [store]);

  const onSliderChange = useCallback((val: number) => {
    store.setValue(val);
  }, [store]);

  return (
    <div className="dali-level-slider">
      <Switch
        value={!isMasked}
        isDisabled={isDisabled}
        onChange={onSwitchChange}
      />
      {isMasked ? (
        <span className="dali-level-slider-mask">{t('json-editor.labels.dali-mask')}</span>
      ) : (
        <Range
          id={inputId ?? ''}
          value={value}
          min={0}
          max={254}
          step={1}
          isDisabled={isDisabled}
          isInvalid={store.hasErrors}
          labelPosition="right"
          formatLabel={formatLabel}
          onChange={onSliderChange}
        />
      )}
    </div>
  );
});

export default DaliLevelSliderEditor;
