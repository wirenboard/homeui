import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { CSSProperties, PropsWithChildren, useId } from 'react';
import { getI18n } from 'react-i18next';
import { ObjectStore, BooleanStore, StringStore, NumberStore, Translator } from '@/stores/json-schema-editor';
import { ObjectStoreParam } from '@/stores/json-schema-editor/object-store';
import { BooleanParamEditor } from './boolean-param-editor';
import { NumberParamEditor } from './number-param-editor';
import { ParamDescription } from './param-description';
import { ParamError } from './param-error';
import { StringParamEditor } from './string-param-editor';
import type { ObjectParamEditorProps, EditorWrapperProps } from './types';

const EditorWrapperLabel = ({ title, inputId }: { title: string; inputId: string }) => {
  return (
    <label htmlFor={inputId} style={{ whiteSpace: 'nowrap' }}>
      {title}
    </label>
  );
};

const EditorWrapper = observer(({
  children,
  inputId,
  descriptionId,
  errorId,
  param,
  translator,
}: PropsWithChildren<EditorWrapperProps>) => {
  const lang = getI18n().language;
  let style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };
  if (param.store.schema.options?.grid_columns) {
    const gridColumns = param.store.schema.options.grid_columns;
    style.flexGrow = 1;
    if (gridColumns === 12) {
      style.flexBasis = '100%';
    } else {
      style.flexBasis = `${(gridColumns / 12) * 100 - 7}%`;
    }
  }
  const showDefaultText = param.store.schema.options?.show_opt_in;
  const defaultText = showDefaultText ? param.store.defaultText : '';
  const title = translator.find(param.store.schema.title || param.key, lang);
  const showError = !!param.store.error;
  const showDescription = !!param.store.schema.description || showDefaultText;
  return (
    <div
      className={classNames({ 'wb-jsonEditor-propertyError': param.store.hasErrors })}
      style={style}
    >
      <EditorWrapperLabel title={title} inputId={inputId} />
      {children}
      {showError && <ParamError id={errorId} error={param.store.error} translator={translator} />}
      {showDescription && (
        <ParamDescription
          id={descriptionId}
          description={translator.find(param.store.schema.description, lang)}
          defaultText={defaultText}
        />
      )}
    </div>
  );
});

const StringEditor = observer(({ param, translator }: { param: ObjectStoreParam; translator: Translator }) => {
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const store = param.store as StringStore;
  return (
    <EditorWrapper
      inputId={inputId}
      descriptionId={descriptionId}
      errorId={errorId}
      param={param}
      translator={translator}
    >
      <StringParamEditor
        store={store}
        inputId={inputId}
        descriptionId={descriptionId}
        errorId={errorId}
        translator={translator}
      />
    </EditorWrapper>
  );
});

const NumberEditor = observer(({ param, translator }: { param: ObjectStoreParam; translator: Translator }) => {
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const store = param.store as NumberStore;
  return (
    <EditorWrapper
      inputId={inputId}
      descriptionId={descriptionId}
      errorId={errorId}
      param={param}
      translator={translator}
    >
      <NumberParamEditor
        store={store}
        inputId={inputId}
        descriptionId={descriptionId}
        errorId={errorId}
        translator={translator}
      />
    </EditorWrapper>
  );
});

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
      return <ObjectParamEditor store={param.store} translator={translator}/>;
    }
    if (param.store instanceof StringStore) {
      return <StringEditor param={param} translator={translator}/>;
    }
    if (param.store instanceof NumberStore) {
      return <NumberEditor param={param} translator={translator}/>;
    }
    if (param.store instanceof BooleanStore) {
      return <BooleanParamEditor key={param.key} store={param.store} translator={translator}/>;
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
