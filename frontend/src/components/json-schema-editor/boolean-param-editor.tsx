import { observer } from 'mobx-react-lite';
import { CSSProperties } from 'react';
import { getI18n } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import { MistypedValue } from '@/stores/json-schema-editor';
import { ParamError } from './param-error';
import type { BooleanParamEditorProps } from './types';

export const BooleanParamEditor = observer(({ key, store, translator } : BooleanParamEditorProps) => {
  const lang = getI18n().language;
  const title = store.schema.title || key;
  let style: CSSProperties = {};
  if (store.schema.options?.grid_columns === 12) {
    style.flexBasis = '100%';
  }
  const value = store.value;
  const indeterminate = value instanceof MistypedValue || value === undefined;
  const checked = indeterminate ? false : value as boolean;
  return (
    <div style={style}>
      <Checkbox
        title={translator.find(title, lang)}
        checked={checked}
        indeterminate={indeterminate}
        onChange={(checked: boolean) => store.setValue(checked)}
      />
      {store.error && <ParamError error={store.error} translator={translator} />}
    </div>
  );
});
