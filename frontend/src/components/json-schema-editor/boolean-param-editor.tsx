import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import { MistypedValue } from '@/stores/json-schema-editor';
import type { BooleanEditorProps } from './types';

const BooleanEditor = observer(({ store, paramId, errorId, descriptionId, translator } : BooleanEditorProps) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const title = translator.find(store.schema.title || paramId, currentLanguage);
  const value = store.value;
  const indeterminate = value instanceof MistypedValue || value === undefined;
  const checked = indeterminate ? false : value as boolean;
  return (
    <Checkbox
      title={title}
      checked={checked}
      indeterminate={indeterminate}
      ariaDescribedby={descriptionId}
      ariaInvalid={store.hasErrors}
      ariaErrorMessage={errorId}
      onChange={(checked: boolean) => store.setValue(checked)}
    />
  );
});

export default BooleanEditor;
