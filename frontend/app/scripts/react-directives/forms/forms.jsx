import { observer } from 'mobx-react-lite';
import { useContext, createContext, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox, LineEdit, Button } from '../common';
import BootstrapLikeSelect from '../components/select/select';
import CollapsiblePanel from './collapsiblePanel';

export const ShowParamCaptionContext = createContext(true);
export const CustomEditorBuilderContext = createContext(null);

function makeFlexItemStyle(columns) {
  const MAX_COLUMNS = 12;
  const columnsCount = columns || MAX_COLUMNS;
  return {
    flexGrow: columnsCount / MAX_COLUMNS,
    flexBasis: `${(columnsCount / MAX_COLUMNS) * 100 * 0.9}%`,
  };
}

export const FormEditDescription = observer(({ description, defaultText }) => {
  const { t } = useTranslation();
  if (defaultText) {
    return (
      <p className="help-block">
        {description && <>{description} </>}
        {t('forms.default-text-prefix')}
        <span className="form-edit-default-text">{defaultText}</span>
        {t('forms.default-text-postfix')}
      </p>
    );
  }
  return <>{description && <p className="help-block">{description}</p>}</>;
});

export const FormEdit = observer(({ store, children }) => {
  const showCaption = useContext(ShowParamCaptionContext);
  return (
    <div
      className={store.hasErrors ? 'form-group has-error' : 'form-group'}
      style={makeFlexItemStyle(store?.formColumns)}
    >
      {showCaption && <label className="control-label">{store.name}</label>}
      {children}
      {showCaption && (
        <FormEditDescription description={store.description} defaultText={store.defaultText} />
      )}
      {store.error && <div className="help-block">{store.error}</div>}
    </div>
  );
});

export const FormStringEdit = observer(
  forwardRef(({ store }, ref) => {
    return (
      <FormEdit store={store}>
        <LineEdit
          value={store.value === undefined ? '' : store.value}
          placeholder={store.placeholder}
          disabled={store.readOnly}
          ref={ref}
          type={store.editType}
          required={store.required}
          onChange={(e) => store.setValue(e.target.value)}
        />
      </FormEdit>
    );
  })
);

export const FormCheckbox = observer(({ store }) => {
  const showCaption = useContext(ShowParamCaptionContext);
  return (
    <div className="form-group" style={makeFlexItemStyle(store?.formColumns)}>
      <Checkbox
        label={showCaption ? store.name : undefined}
        value={store.value}
        onChange={(e) => store.setValue(e.target.checked)}
      />
    </div>
  );
});

export const FormSelect = observer(({ store, isClearable }) => {
  return (
    <FormEdit store={store}>
      <BootstrapLikeSelect
        options={store.options}
        isClearable={isClearable}
        selectedOption={store.selectedOption}
        setSelectedOption={store.selectedOption}
        placeholder={store.placeholder}
        disabled={store.readOnly}
        onChange={(value) => store.setSelectedOption(value)}
      />
    </FormEdit>
  );
});

export const FormOneOf = observer(({ store }) => {
  return (
    <ShowParamCaptionContext.Provider value={false}>
      <div style={makeFlexItemStyle(store?.formColumns)}>
        <legend
          style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'baseline' }}
        >
          <span>{store.optionsStore.name}</span>
          <div style={{ fontSize: '13px' }}>
            <FormSelect store={store.optionsStore} isClearable={false} />
          </div>
        </legend>
        {store.selectedForm && <FormEditor param={store.selectedForm} paramName={store.name} />}
      </div>
    </ShowParamCaptionContext.Provider>
  );
});

export const FormCollapsibleTable = observer(({ store }) => {
  const { t } = useTranslation();
  return (
    <CollapsiblePanel title={store.name}>
      <table className="table table-bordered">
        <thead>
          <tr>
            {store.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          <ShowParamCaptionContext.Provider value={false}>
            {store.items.map((item, index) => (
              <tr key={index}>
                {Object.entries(item.params).map(([key, param]) => {
                  return (
                    <td key={key + index}>
                      <FormEditor param={param} paramName={key + index} />
                    </td>
                  );
                })}
                <td>
                  <Button
                    icon="glyphicon glyphicon-trash"
                    title={t('forms.remove')}
                    onClick={() => {
                      if (confirm(t('forms.confirm-remove'))) {
                        store.remove(index);
                      }
                    }}
                  />
                </td>
              </tr>
            ))}
          </ShowParamCaptionContext.Provider>
        </tbody>
      </table>
    </CollapsiblePanel>
  );
});

export const FormEditor = forwardRef(({ param, paramName }, ref) => {
  const customEditorBuilder = useContext(CustomEditorBuilderContext);
  if (customEditorBuilder) {
    const customEditor = customEditorBuilder(param, paramName);
    if (customEditor) {
      return customEditor;
    }
  }
  if (param.type === 'string') {
    return <FormStringEdit store={param} ref={ref} />;
  }
  if (param.type === 'integer') {
    return <FormStringEdit store={param} ref={ref} />;
  }
  if (param.type === 'number') {
    return <FormStringEdit store={param} ref={ref} />;
  }
  if (param.type === 'boolean') {
    return <FormCheckbox store={param} />;
  }
  if (param.type === 'options') {
    return <FormSelect store={param} />;
  }
  if (param.type === 'object') {
    return <Form store={param} />;
  }
  if (param.type === 'array') {
    return <FormCollapsibleTable store={param} />;
  }
  if (param.type === 'oneOf') {
    return <FormOneOf store={param} />;
  }
  return null;
});

export const MakeFormFields = (params, firstRef) => {
  return params.map(([name, param], index) => {
    if (index === 0) {
      return <FormEditor param={param} paramName={name} key={name} ref={firstRef} />;
    }
    return <FormEditor param={param} paramName={name} key={name} />;
  });
};

export const Form = observer(({ store, children }) => {
  const { t } = useTranslation();
  const showCaption = useContext(ShowParamCaptionContext);
  if (!store) {
    return null;
  }
  return (
    <div style={makeFlexItemStyle(store?.formColumns)}>
      {showCaption && <legend>{t(store.name)}</legend>}
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10px' }}>
        <ShowParamCaptionContext.Provider value={true}>
          {MakeFormFields(Object.entries(store.params))}
        </ShowParamCaptionContext.Provider>
      </div>
      {children}
    </div>
  );
});
