import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox, LineEdit } from '../common';
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
  const withGroups = store.options.some(el => 'options' in el);
  const borderColor = store.hasErrors ? '#b94a48' : '#ccc';
  const customStyles = {
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: provided => ({
      ...provided,
      color: 'black',
      paddingLeft: '0px',
      paddingRight: '0px',
      width: '15px',
    }),
    clearIndicator: provided => ({
      ...provided,
      color: 'black',
      paddingLeft: '0px',
      paddingRight: '0px',
      width: '15px',
    }),
    indicatorsContainer: provided => ({
      ...provided,
      height: '32px',
    }),
    control: provided => ({
      ...provided,
      borderRadius: '0px',
      borderColor: borderColor,
      boxShadow: 'unset',
      height: '32px',
      minHeight: '32px',
      ':hover': {
        borderColor: borderColor,
      },
    }),
    groupHeading: provided => {
      return {
        ...provided,
        textTransform: 'unset',
        fontSize: 'unset',
        color: 'black',
        fontWeight: 'bold',
      };
    },
    option: provided => {
      if (withGroups) {
        provided.paddingLeft = '20px';
      }
      return provided;
    },
  };
  return (
    <FormEdit
      name={store.name}
      error={store.error}
      hasErrors={store.hasErrors}
      description={store.description}
    >
      <Select
        options={store.options}
        isSearchable={true}
        isClearable={isClearable}
        value={store.selectedOption}
        styles={customStyles}
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
