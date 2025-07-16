import { observer } from 'mobx-react-lite';
import { useId, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import { MistypedValue } from '@/stores/json-schema-editor';
import { EditorWrapper } from './editor-wrapper';
import type { BooleanParamEditorProps } from './types';

const BooleanParamEditor = observer(({ store, paramId, translator } : BooleanParamEditorProps) => {
  const descriptionId = useId();
  const errorId = useId();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const title = translator.find(store.schema.title || paramId, currentLanguage);
  let style: CSSProperties = {};
  if (store.schema.options?.grid_columns === 12) {
    style.flexBasis = '100%';
  }
  const value = store.value;
  const indeterminate = value instanceof MistypedValue || value === undefined;
  const checked = indeterminate ? false : value as boolean;
  return (
    <EditorWrapper
      descriptionId={descriptionId}
      errorId={errorId}
      store={store}
      translator={translator}
    >
      <Checkbox
        title={title}
        checked={checked}
        indeterminate={indeterminate}
        ariaDescribedby={descriptionId}
        ariaInvalid={store.hasErrors}
        ariaErrorMessage={errorId}
        onChange={(checked: boolean) => store.setValue(checked)}
      />
    </EditorWrapper>
  );
});

export default BooleanParamEditor;
