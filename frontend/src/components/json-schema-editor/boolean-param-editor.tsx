import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import { Switch } from '@/components/switch';
import { MistypedValue } from '@/stores/json-schema-editor';
import type { BooleanEditorProps } from './types';

const BooleanEditor = observer(({
  store,
  paramId,
  errorId,
  descriptionId,
  translator,
  titleOverride,
} : BooleanEditorProps) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const title = titleOverride ?? translator.find(store.schema.title || paramId, currentLanguage);
  const value = store.value;
  const indeterminate = value instanceof MistypedValue || value === undefined;
  const checked = indeterminate ? false : value as boolean;
  if (store.schema.format === 'switch') {
    return (
      <div className="wb-jsonEditor-booleanEditorSwitch">
        <Switch
          value={checked}
          ariaDescribedby={descriptionId}
          ariaInvalid={store.hasErrors}
          ariaErrorMessage={errorId}
          onChange={(checked: boolean) => store.setValue(checked)}
        />
        {!store.schema.options?.compact && <label className="wb-jsonEditor-booleanEditorSwitchLabel">{title}</label>}
      </div>
    );
  }

  return (
    <Checkbox
      title={store.schema.options?.compact ? '' : title}
      checked={checked}
      indeterminate={indeterminate}
      ariaDescribedby={descriptionId}
      ariaInvalid={store.hasErrors}
      ariaErrorMessage={errorId}
      variant={store.schema.format === 'button' ? 'button' : 'default'}
      onChange={(checked: boolean) => store.setValue(checked)}
    />
  );
});

export default BooleanEditor;
