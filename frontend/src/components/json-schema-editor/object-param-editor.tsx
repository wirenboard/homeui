import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { CSSProperties, PropsWithChildren, useId } from 'react';
import { getI18n, useTranslation } from 'react-i18next';
import { ObjectStore, BooleanStore, StringStore, NumberStore, Translator } from '@/stores/json-schema-editor';
import { ObjectStoreParam } from '@/stores/json-schema-editor/object-store';
import { BooleanParamEditor } from './boolean-param-editor';
import { NumberParamEditor } from './number-param-editor';
import { ParamDescription } from './param-description';
import { ParamError } from './param-error';
import { StringParamEditor } from './string-param-editor';

interface EditorWrapperLabelProps {
  title: string;
  param: ObjectStoreParam;
  inputId?: string;
}

const OptInParameterLabel = ({ title, param }: EditorWrapperLabelProps) => {
  const { t } = useTranslation();
  return (
    <label className="wb-jsonEditor-checkbox wb-jsonEditor-optInCheckbox">
      <input
        type="checkbox"
        checked={!param.isDisabled}
        aria-label={t('json-editor.labels.opt-in-param', { title: title })}
        onChange={(e) => {
          if (e.target.checked) {
            param.enable();
          } else {
            param.disable();
          }
        }}
      />
      {title}
    </label>
  );
};

const EditorWrapperLabel = ({ title, param, inputId }: EditorWrapperLabelProps) => {
  const options = param.store.schema.options;
  if (!param.store.required && !options?.wb?.show_editor && options?.show_opt_in) {
    return <OptInParameterLabel title={title} param={param}/>;
  }
  return (
    <label htmlFor={inputId} style={{ whiteSpace: 'nowrap' }}>
      {title}
    </label>
  );
};

interface EditorWrapperProps {
  inputId: string;
  descriptionId: string;
  errorId: string;
  param: ObjectStoreParam;
  translator: Translator;
}

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
    style.flexGrow = gridColumns / 12;
    style.flexBasis = gridColumns === 12 ? '100%' : 'min-content';
    style.flexShrink = 1;
  }
  const defaultText = param.store.schema.options?.wb?.show_editor ? '' : param.store.defaultText;
  const title = translator.find(param.store.schema.title || param.key, lang);
  return (
    <div
      className={classNames({ 'wb-jsonEditor-propertyError': param.store.hasErrors && !param.isDisabled })}
      style={style}
    >
      <EditorWrapperLabel title={title} param={param} inputId={inputId} />
      {children}
      {!param.isDisabled && <ParamError id={errorId} error={param.store.error} translator={translator} />}
      <ParamDescription
        id={descriptionId}
        description={translator.find(param.store.schema.description, lang)}
        defaultText={defaultText}
      />
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
        isDisabled={param.isDisabled}
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
        isDisabled={param.isDisabled}
        translator={translator}
      />
    </EditorWrapper>
  );
});

const shouldRenderObjectParamEditor = (param: ObjectStoreParam) => {
  if (param.store.schema.options?.hidden) {
    return false;
  }
  return !param.isDisabled || param.store.schema.options?.wb?.show_editor || param.store.schema.options?.show_opt_in;
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

interface ObjectParamEditorProps {
  store: ObjectStore;
  translator: Translator;
}

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
