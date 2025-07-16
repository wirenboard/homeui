import { observer } from 'mobx-react-lite';
import { CSSProperties } from 'react';
import { Translator, ObjectStoreParam } from '@/stores/json-schema-editor';
import type { ObjectParamEditorProps, EditorBuilderFunction } from './types';

const shouldRenderObjectParamEditor = (param: ObjectStoreParam) => {
  if (param.store.schema.options?.hidden) {
    return false;
  }
  return param.store.required ||
         param.store.schema.options?.wb?.show_editor ||
         param.store.schema.options?.show_opt_in ||
         !param.disabled;
};

const MakeObjectParamEditor = (
  param: ObjectStoreParam,
  translator: Translator,
  editorBuilder: EditorBuilderFunction
) => {
  if (editorBuilder && shouldRenderObjectParamEditor(param)) {
    return editorBuilder(param.store, param.key, translator);
  }
  return null;
};

const ObjectParamEditor = observer(({ store, translator, editorBuilder } : ObjectParamEditorProps) => {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: store.schema.format === 'grid' ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: '15px',
  };
  return (
    <div style={style}>
      {store.params.map((param) => MakeObjectParamEditor(param, translator, editorBuilder))}
    </div>
  );
});

export default ObjectParamEditor;
