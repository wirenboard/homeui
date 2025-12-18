import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '@/components/dropdown';
import { Input } from '@/components/input';
import type { NumberEditorProps } from './types';

const NumberEditor = observer(({
  store,
  inputId,
  descriptionId,
  errorId,
  translator,
  isDisabled,
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
      isDisabled={isDisabled || store.schema.options?.wb?.read_only}
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
      isDisabled={isDisabled || store.schema.options?.wb?.read_only}
      onChange={(value) => store.setEditString(String(value))}
    />
  );
});

export default NumberEditor;
