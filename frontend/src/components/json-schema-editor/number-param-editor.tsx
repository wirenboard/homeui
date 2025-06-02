import { observer } from 'mobx-react-lite';
import { getI18n } from 'react-i18next';
import { Dropdown } from '@/components/dropdown';
import { Input } from '@/components/input';
import { NumberStore, Translator } from '@/stores/json-schema-editor';

interface NumberParamEditorProps {
  store: NumberStore;
  inputId?: string;
  descriptionId?: string;
  errorId?: string;
  isDisabled?: boolean;
  translator: Translator;
}

export const NumberParamEditor = observer(({
  store,
  inputId,
  descriptionId,
  errorId,
  isDisabled,
  translator,
}: NumberParamEditorProps) => {
  const lang = getI18n().language;
  const value = store.value;
  if (store.schema.enum) {
    return (
      <Dropdown
        id={inputId}
        options={store.enumOptions}
        value={store.value}
        placeholder={translator.find(store.schema?.options?.inputAttributes?.placeholder, lang)}
        isDisabled={isDisabled}
        size="small"
        onChange={(option) => {
          store.setValue(typeof option.value === 'number' ? option.value : undefined);
        }}
      />
    );
  }
  return (
    <Input
      id={inputId}
      type="number"
      value={typeof value !== 'number' ? '' : value}
      placeholder={translator.find(store.schema?.options?.inputAttributes?.placeholder, lang)}
      isDisabled={isDisabled}
      ariaDescribedby={descriptionId}
      ariaInvalid={store.hasErrors}
      ariaErrorMessage={errorId}
      onChange={(value) => store.setValue(value)}
    />
  );
});
