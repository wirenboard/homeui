import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { Range } from '@/components/range';
import type { RangeSliderEditorProps } from './types';

const RangeSliderEditor = observer(({ store, inputId }: RangeSliderEditorProps) => {
  const min = store.schema.minimum ?? 0;
  const max = store.schema.maximum ?? 100;
  const value = typeof store.value === 'number' ? store.value : min;
  const isDisabled = !!store.schema.options?.wb?.read_only;

  const onChange = useCallback((val: number) => {
    store.setValue(val);
  }, [store]);

  return (
    <Range
      id={inputId ?? ''}
      value={value}
      min={min}
      max={max}
      step={1}
      isDisabled={isDisabled}
      isInvalid={store.hasErrors}
      labelPosition="bottom"
      formatLabel={(val) => String(val)}
      onChange={onChange}
    />
  );
});

export default RangeSliderEditor;
