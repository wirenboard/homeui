import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { type Translator, type ObjectParamStore, type PropertyStore } from '@/stores/json-schema-editor';
import { EditorWrapper } from './editor-wrapper';
import type { ObjectEditorProps, EditorBuilderFunction } from './types';

const shouldRenderObjectParamEditor = (param: ObjectParamStore) => {
  return param.hidden ? false : !param.disabled || param.hasPermanentEditor;
};

const ObjectParamEditor = ({
  param,
  rootStore,
  translator,
  editorBuilder,
}: {
  param: ObjectParamStore;
  rootStore: PropertyStore;
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
      {editorBuilder({
        store: param.store,
        rootStore,
        paramId: param.key,
        translator,
        inputId,
        descriptionId,
        errorId,
        hideError: param.disabled,
      })}
    </EditorWrapper>
  );
};

const ObjectParamEditorRow = ({
  params,
  rootStore,
  translator,
  editorBuilder,
}: {
  params: ObjectParamStore[];
  rootStore: PropertyStore;
  translator: Translator;
  editorBuilder: EditorBuilderFunction;
}) => {
  if (params.length === 1) {
    return (
      <ObjectParamEditor
        param={params[0]}
        rootStore={rootStore}
        translator={translator}
        editorBuilder={editorBuilder}
      />
    );
  }
  return (
    <div className="wb-jsonEditor-objectEditorRow">
      {params.map((p) => (
        <ObjectParamEditor
          key={p.key}
          param={p}
          rootStore={rootStore}
          translator={translator}
          editorBuilder={editorBuilder}
        />
      ))}
    </div>
  );
};

const makeLayout = (params: ObjectParamStore[], rootStore: PropertyStore, translator, editorBuilder) => {
  let res = [];
  let elements = [];
  let slotsInRow = 0;
  const MAX_SLOTS = 12;
  for (const param of params) {
    if (shouldRenderObjectParamEditor(param)) {
      const gridColumns = param.store.schema.options?.grid_columns ?? MAX_SLOTS + 1;
      const newRow = param.store.schema.options?.wb?.new_row ?? false;
      if (slotsInRow === 0 || (!newRow && slotsInRow + gridColumns <= MAX_SLOTS)) {
        slotsInRow += gridColumns;
        elements.push(param);
      } else {
        res.push(
          <ObjectParamEditorRow
            key={elements.map((e) => e.key).join('-')}
            params={elements}
            rootStore={rootStore}
            translator={translator}
            editorBuilder={editorBuilder}
          />
        );
        elements = [param];
        slotsInRow = gridColumns;
      }
    }
  }
  if (elements.length) {
    res.push(
      <ObjectParamEditorRow
        key={elements.map((e) => e.key).join('-')}
        params={elements}
        rootStore={rootStore}
        translator={translator}
        editorBuilder={editorBuilder}
      />
    );
  }
  return res;
};

const ObjectEditor = observer(({ store, rootStore, translator, editorBuilder, isTopLevel } : ObjectEditorProps) => {
  return (
    <div
      className={
        classNames(
          'wb-jsonEditor-objectEditor',
          { 'wb-jsonEditor-objectEditorWithBorder': !isTopLevel && store.schema.format !== 'card' }
        )
      }
    >
      {editorBuilder && makeLayout(store.params, rootStore, translator, editorBuilder)}
    </div>
  );
});

export default ObjectEditor;
