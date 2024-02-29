import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox, LineEdit, BootstrapLikeSelect } from '../common';
import Select from 'react-select';

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

export const FormEdit = observer(
  ({ name, error, hasErrors, description, defaultText, children }) => {
    return (
      <div className={hasErrors ? 'form-group has-error' : 'form-group'}>
        <label className="control-label">{name}</label>
        {children}
        <FormEditDescription description={description} defaultText={defaultText} />
        {error && <div className="help-block">{error}</div>}
      </div>
    );
  }
);

export const FormStringEdit = observer(({ store }) => {
  return (
    <FormEdit
      name={store.name}
      error={store.error}
      hasErrors={store.hasErrors}
      description={store.description}
      defaultText={store.defaultText}
    >
      <LineEdit
        value={store.value}
        placeholder={store.placeholder}
        onChange={e => store.setValue(e.target.value)}
      />
    </FormEdit>
  );
});

export const FormCheckbox = observer(({ store }) => {
  return (
    <div className="form-group">
      <Checkbox
        id={store.id}
        label={store.name}
        value={store.value}
        onChange={e => store.setValue(e.target.checked)}
      />
    </div>
  );
});

export const FormSelect = observer(({ store, isClearable }) => {
  return (
    <FormEdit
      name={store.name}
      error={store.error}
      hasErrors={store.hasErrors}
      description={store.description}
    >
      <BootstrapLikeSelect
        options={store.options}
        isClearable={isClearable}
        setSelectedOption={store.selectedOption}
        placeholder={store.placeholder}
        onChange={value => store.setSelectedOption(value)}
      />
    </FormEdit>
  );
});

export const MakeFormFields = params => {
  return params.map(([key, param]) => {
    if (param.type === 'string') {
      return <FormStringEdit key={key} store={param} />;
    }
    if (param.type === 'integer') {
      return <FormStringEdit key={key} store={param} />;
    }
    if (param.type === 'boolean') {
      return <FormCheckbox key={param.id} store={param} />;
    }
    if (param.type === 'options') {
      return <FormSelect key={key} store={param} />;
    }
  });
};

export const Form = observer(({ store, children }) => {
  const { t } = useTranslation();
  if (!store) {
    return null;
  }
  return (
    <div>
      <legend>{t(store.title)}</legend>
      {MakeFormFields(Object.entries(store.params))}
      {children}
    </div>
  );
});
