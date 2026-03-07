import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChannelSlider } from './components/channel-slider';
import type { DaliWhiteEditorProps } from './types';

const MASK_VALUE = 255;

export const DaliWhiteEditor = observer(({ store, inputId }: DaliWhiteEditorProps) => {
  const { t } = useTranslation();
  const isDisabled = !!store.schema.options?.wb?.read_only;
  const isInvalid = store.hasErrors;
  const maskLabel = t('json-editor.labels.dali-mask');

  const value = typeof store.value === 'number' ? Math.min(MASK_VALUE, Math.max(0, store.value)) : MASK_VALUE;

  const onChange = useCallback((val: number) => {
    store.setValue(val);
  }, [store]);

  return (
    <div className="dali-white-editor" id={inputId}>
      <ChannelSlider
        value={value}
        color="rgb(255, 255, 255)"
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        maskLabel={maskLabel}
        onChange={onChange}
      />
    </div>
  );
});
