import { observer } from 'mobx-react-lite';
import { CSSProperties } from 'react';
import {
  ObjectStore,
  BooleanStore,
  StringStore,
  NumberStore,
  Translator,
  ObjectStoreParam
} from '@/stores/json-schema-editor';
import { BooleanParamEditor } from './boolean-param-editor';
import { NumberParamEditor } from './number-param-editor';
import { StringParamEditor } from './string-param-editor';
import type { ObjectParamEditorProps } from './types';

const shouldRenderObjectParamEditor = (param: ObjectStoreParam) => {
  if (param.store.schema.options?.hidden) {
    return false;
  }
  return param.store.required ||
         param.store.schema.options?.wb?.show_editor ||
         param.store.schema.options?.show_opt_in ||
         !param.disabled;
};

const MakeObjectParamEditor = (param: ObjectStoreParam, translator: Translator) => {
  if (shouldRenderObjectParamEditor(param)) {
    if (param.store instanceof ObjectStore) {
      return <ObjectParamEditor key={param.key} store={param.store} translator={translator}/>;
    }
    if (param.store instanceof StringStore) {
      return <StringParamEditor store={param.store} paramId={param.key} translator={translator}/>;
    }
    if (param.store instanceof NumberStore) {
      return <NumberParamEditor store={param.store} paramId={param.key} translator={translator}/>;
    }
    if (param.store instanceof BooleanStore) {
      return <BooleanParamEditor store={param.store} paramId={param.key} translator={translator}/>;
    }
  }
  return null;
};

const MakeObjectParamsEditors = (params: ObjectStoreParam[], translator: Translator) => {
  return params.map((param) => MakeObjectParamEditor(param, translator));
};

export const ObjectParamEditor = observer(({ store, translator } : ObjectParamEditorProps) => {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: store.schema.format === 'grid' ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: '15px',
  };
  return (
    <div style={style}>
      {MakeObjectParamsEditors(store.params, translator)}
    </div>
  );
});
