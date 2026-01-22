import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { type Translator, type ObjectParamStore } from '@/stores/json-schema-editor';
import { EditorWrapper } from './editor-wrapper';
import type { ObjectEditorProps, EditorBuilderFunction } from './types';
import classNames from 'classnames';

const shouldRenderObjectParamEditor = (param: ObjectParamStore) => {
  return param.hidden ? false : !param.disabled || param.hasPermanentEditor;
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
      {editorBuilder({ store: param.store, paramId: param.key, translator, inputId, descriptionId, errorId, hideError: param.disabled })}
    </EditorWrapper>
  );
};

const ObjectParamEditorRow = ({
  params,
  translator,
  editorBuilder,
}: {
  params: ObjectParamStore[];
  translator: Translator;
  editorBuilder: EditorBuilderFunction;
}) => {
  if (params.length === 1) {
    return (
      <ObjectParamEditor
        param={params[0]}
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
          translator={translator}
          editorBuilder={editorBuilder}
        />
      ))}
    </div>
  );
};

const makeLayout = (params: ObjectParamStore[], translator, editorBuilder) => {
  let res = [];
  let elements = [];
  let slotsInRow = 0;
  const MAX_SLOTS = 12;
  for (const param of params) {
    if (shouldRenderObjectParamEditor(param)) {
      const gridColumns = param.store.schema.options?.grid_columns ?? MAX_SLOTS + 1;
      if (slotsInRow === 0 || slotsInRow + gridColumns <= MAX_SLOTS) {
        slotsInRow += gridColumns;
        elements.push(param);
      } else {
        res.push(
          <ObjectParamEditorRow
            key={elements.map((e) => e.key).join('-')}
            params={elements}
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
        translator={translator}
        editorBuilder={editorBuilder}
      />
    );
  }
  return res;
};

const ObjectEditor = observer(({ store, translator, editorBuilder, isTopLevel } : ObjectEditorProps) => {
  return (
    <div className={classNames("wb-jsonEditor-objectEditor", { "wb-jsonEditor-objectEditorWithBorder": !isTopLevel })}>
      {editorBuilder && makeLayout(store.params, translator, editorBuilder)}
    </div>
  );
});

export default ObjectEditor;
