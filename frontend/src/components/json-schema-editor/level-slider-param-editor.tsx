import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { Range } from '@/components/range';
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

const DaliLevelSliderEditor = observer(({
  store,
  rootStore,
  inputId,
}: DaliLevelSliderEditorProps) => {
  const value = typeof store.value === 'number' ? store.value : 0;
  const onChange = useCallback((val: number) => store.setValue(val), [store]);
  const dimmingCurve = getDimmingCurve(rootStore);

  const formatLabel = useCallback((level: number): string => {
    const percent = dimmingCurve === 1 ? linearPercent(level) : logPercent(level);
    return formatPercent(percent);
  }, [dimmingCurve]);

  return (
    <Range
      id={inputId ?? ''}
      value={value}
      min={0}
      max={254}
      step={1}
      isDisabled={!!store.schema.options?.wb?.read_only}
      isInvalid={store.hasErrors}
      labelPosition="right"
      formatLabel={formatLabel}
      onChange={onChange}
    />
  );
});

export default DaliLevelSliderEditor;
