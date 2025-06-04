import { observer } from 'mobx-react-lite';
import { getI18n } from 'react-i18next';
import { Dropdown } from '@/components/dropdown';
import { Input } from '@/components/input';
import { StringStore, Translator } from '@/stores/json-schema-editor';

interface StringParamEditorProps {
  store: StringStore;
  inputId?: string;
  descriptionId?: string;
  errorId?: string;
  isDisabled?: boolean;
  translator: Translator;
}

export const StringParamEditor = observer(({
  store,
  inputId,
  descriptionId,
  errorId,
  isDisabled,
  translator,
}: StringParamEditorProps) => {
  const lang = getI18n().language;
  const value = store.value;
  const valueToDisplay = typeof value !== 'string' ? '' : value;
  if (store.schema.enum) {
    return (
      <Dropdown
        id={inputId}
        options={store.enumOptions}
        value={valueToDisplay}
        placeholder={translator.find(store.schema?.options?.inputAttributes?.placeholder, lang)}
        isDisabled={isDisabled}
        size="small"
        onChange={(option) => {
          store.setValue(typeof option.value === 'string' ? option.value : undefined);
        }}
      />
    );
  }
  return (
    <Input
      id={inputId}
      value={valueToDisplay}
      placeholder={translator.find(store.schema?.options?.inputAttributes?.placeholder, lang)}
      isDisabled={isDisabled}
      ariaDescribedby={descriptionId}
      ariaInvalid={store.hasErrors}
      ariaErrorMessage={errorId}
      onChange={(value) => store.setValue(String(value))}
    />
  );
});
