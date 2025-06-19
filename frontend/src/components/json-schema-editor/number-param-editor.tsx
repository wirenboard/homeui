import { observer } from 'mobx-react-lite';
import { getI18n } from 'react-i18next';
import { Dropdown } from '@/components/dropdown';
import { Input } from '@/components/input';
import type { NumberParamEditorProps } from './types';

export const NumberParamEditor = observer(({
  store,
  inputId,
  descriptionId,
  errorId,
  translator,
}: NumberParamEditorProps) => {
  const lang = getI18n().language;
  return store.schema.enum ? (
    <Dropdown
      id={inputId}
      options={store.enumOptions}
      value={typeof store.value === 'number' ? store.value : undefined}
      placeholder={translator.find(store.schema.options?.inputAttributes?.placeholder, lang)}
      minWidth="30px"
      onChange={(option) => {
        store.setValue(typeof option.value === 'number' ? option.value : undefined);
      }}
    />
  ) : (
    <Input
      id={inputId}
      value={store.editString}
      placeholder={translator.find(store.schema.options?.inputAttributes?.placeholder, lang)}
      ariaDescribedby={descriptionId}
      ariaInvalid={store.hasErrors}
      ariaErrorMessage={errorId}
      onChange={(value) => store.setEditString(String(value))}
    />
  );
});
