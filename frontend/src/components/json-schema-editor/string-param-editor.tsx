import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '@/components/dropdown';
import { Input } from '@/components/input';
import type { StringEditorProps } from './types';

const StringEditor = observer(({
  store,
  inputId,
  descriptionId,
  errorId,
  translator,
}: StringEditorProps) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const value = store.value;
  const valueToDisplay = typeof value === 'string' ? value : '';
  const isOptInEditor = store.schema.options?.wb?.show_editor || store.schema.options?.show_opt_in;
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
      value={valueToDisplay}
      placeholder={translator.find(store.schema.options?.inputAttributes?.placeholder, currentLanguage)}
      minWidth="30px"
      onChange={(option) => {
        if (typeof option.value === 'string') {
          store.setValue(option.value);
        } else {
          store.setUndefined();
        }
      }}
    />
  ) : (
    <Input
      id={inputId}
      value={valueToDisplay}
      placeholder={translator.find(store.schema.options?.inputAttributes?.placeholder, currentLanguage)}
      ariaDescribedby={descriptionId}
      ariaInvalid={store.hasErrors}
      ariaErrorMessage={errorId}
      onChange={(value) => {
        if (value === '' && !store.required && isOptInEditor) {
          store.setUndefined();
        } else {
          store.setValue(String(value));
        }
      }}
    />
  );
});

export default StringEditor;
