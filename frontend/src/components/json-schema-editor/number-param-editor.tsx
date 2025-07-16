import { observer } from 'mobx-react-lite';
import { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '@/components/dropdown';
import { Input } from '@/components/input';
import { EditorWrapper, EditorWrapperLabel } from './editor-wrapper';
import type { NumberEditorProps, NumberParamEditorProps } from './types';

const NumberEditor = observer(({
  store,
  inputId,
  descriptionId,
  errorId,
  translator,
}: NumberEditorProps) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const enumOptions = useMemo(() => {
    if (!store.schema.enum) return [];
    return store.enumOptions.map((option) => ({
      value: option.value,
      label: translator.find(option.label, currentLanguage),
    }));
  }, [store.enumOptions, translator, currentLanguage]);
  return store.schema.enum ? (
    <Dropdown
      id={inputId}
      options={enumOptions}
      value={typeof store.value === 'number' ? store.value : undefined}
      placeholder={translator.find(store.schema.options?.inputAttributes?.placeholder, currentLanguage)}
      minWidth="30px"
      onChange={(option) => {
        if (typeof option.value === 'number' || typeof option.value === 'string') {
          store.setValue(option.value);
        } else {
          store.setUndefined();
        }
      }}
    />
  ) : (
    <Input
      id={inputId}
      value={store.editString}
      placeholder={translator.find(store.schema.options?.inputAttributes?.placeholder, currentLanguage)}
      ariaDescribedby={descriptionId}
      ariaInvalid={store.hasErrors}
      ariaErrorMessage={errorId}
      onChange={(value) => store.setEditString(String(value))}
    />
  );
});

const NumberParamEditor = observer(({ store, paramId, translator }: NumberParamEditorProps) => {
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const title = translator.find(store.schema.title || paramId, currentLanguage);
  return (
    <EditorWrapper
      descriptionId={descriptionId}
      errorId={errorId}
      store={store}
      translator={translator}
    >
      {!store.schema.options?.compact && <EditorWrapperLabel title={title} inputId={inputId} />}
      <NumberEditor
        store={store}
        inputId={inputId}
        descriptionId={descriptionId}
        errorId={errorId}
        translator={translator}
      />
    </EditorWrapper>
  );
});

export default NumberParamEditor;
