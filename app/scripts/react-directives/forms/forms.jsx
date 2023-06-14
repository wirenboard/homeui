import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox, LineEdit } from '../common';

export const FormEdit = observer(({ name, error, hasErrors, description, children }) => {
  return (
    <div className={hasErrors ? 'form-group has-error' : 'form-group'}>
      <label className="control-label">{name}</label>
      {children}
      {description && <p className="help-block">{description}</p>}
      {error && <div className="help-block">{error}</div>}
    </div>
  );
});

export const FormStringEdit = observer(({ store }) => {
  return (
    <FormEdit
      name={store.name}
      error={store.error}
      hasErrors={store.hasErrors}
      description={store.description}
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
