import { observer } from 'mobx-react-lite';
import { CSSProperties,useId } from 'react';
import { Translator, ObjectParamStore } from '@/stores/json-schema-editor';
import { EditorWrapper } from './editor-wrapper';
import type { ObjectEditorProps, EditorBuilderFunction } from './types';

const shouldRenderObjectParamEditor = (param: ObjectParamStore) => {
  if (param.store.schema.options?.hidden) {
    return false;
  }
  return param.store.required ||
         param.store.schema.options?.wb?.show_editor ||
         param.store.schema.options?.show_opt_in ||
         !param.disabled;
};

const ObjectParamEditor = ({
  param,
  translator,
  editorBuilder,
}: {
  param: ObjectParamStore;
  translator: Translator;
  editorBuilder: EditorBuilderFunction;
}) => {
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  return (
    <EditorWrapper
      param={param}
      translator={translator}
      inputId={inputId}
      descriptionId={descriptionId}
      errorId={errorId}
    >
      {editorBuilder({ store: param.store, paramId: param.key, translator, inputId, descriptionId, errorId })}
    </EditorWrapper>
  );
};

const ObjectEditor = observer(({ store, translator, editorBuilder } : ObjectEditorProps) => {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: store.schema.format === 'grid' ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: '15px',
  };
  return (
    <div style={style}>
      {store.params.map((param) => {
        if (editorBuilder && shouldRenderObjectParamEditor(param)) {
          return (
            <ObjectParamEditor
              key={param.key}
              param={param}
              translator={translator}
              editorBuilder={editorBuilder}
            />
          );
        }
        return null;
      })}
    </div>
  );
});

export default ObjectEditor;
