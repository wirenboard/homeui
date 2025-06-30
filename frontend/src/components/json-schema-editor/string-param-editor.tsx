import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '@/components/dropdown';
import { Input } from '@/components/input';
import type { StringParamEditorProps } from './types';

export const StringParamEditor = observer(({
  store,
  inputId,
  descriptionId,
  errorId,
  translator,
}: StringParamEditorProps) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const value = store.value;
  const valueToDisplay = typeof value !== 'string' ? '' : value;
  const isOptInEditor = store.schema.options?.wb?.show_editor || store.schema.options?.show_opt_in;
  return store.schema.enum ? (
    <Dropdown
      id={inputId}
      options={store.enumOptions}
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
