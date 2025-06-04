import { observer } from 'mobx-react-lite';
import { CSSProperties } from 'react';
import { getI18n } from 'react-i18next';
import { BooleanStore, Translator, MistypedValue } from '@/stores/json-schema-editor';
import { ParamError } from './param-error';

interface BooleanParamEditorProps {
  key: string;
  store: BooleanStore;
  translator: Translator;
}

export const BooleanParamEditor = observer(({ key, store, translator } : BooleanParamEditorProps) => {
  const lang = getI18n().language;
  const title = store.schema.title || key;
  let style: CSSProperties = {};
  if (store.schema.options.grid_columns === 12) {
    style.flexBasis = '100%';
  }
  const value = store.value;
  const indeterminate = value instanceof MistypedValue || value === undefined;
  const checked = indeterminate ? false : value as boolean;
  return (
    <div style={style}>
      <label className="wb-jsonEditor-checkbox">
        <input
          type="checkbox"
          checked={checked}
          ref={(el) => {
            if (el) {
              el.indeterminate = indeterminate;
            }
          }}
          onChange={(e) => store.setValue(e.target.checked)}
        />
        {translator.find(title, lang)}
      </label>
      {!store.error && <ParamError msg={store.error} />}
    </div>
  );
});
