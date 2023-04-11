import { observer } from 'mobx-react-lite';
import React from 'react';

export const WarningTag = ({ text }) => {
  return <span className="tag bg-warning text-nowrap">{text}</span>;
};

export const ErrorTag = ({ text }) => {
  return <span className="tag bg-danger text-nowrap">{text}</span>;
};

export const BootstrapRow = props => {
  return <div className="row">{props.children}</div>;
};

export const BootstrapRowWithLabel = ({ label, children }) => {
  return (
    <BootstrapRow>
      <div className="form-group col-md-12">
        <label>{label}</label>
        {children}
      </div>
    </BootstrapRow>
  );
};

export const Spinner = () => {
  return (
    <BootstrapRow>
      <div className="col-xs-12 spinner">
        <span className="spinner-loader"></span>
      </div>
    </BootstrapRow>
  );
};

export const ErrorBar = ({ msg }) => {
  if (!msg) {
    return null;
  }
  return (
    <div className="alert alert-danger" role="alert">
      <span className="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>
      <span> {msg}</span>
    </div>
  );
};

export const WarningBar = ({ children }) => {
  return (
    <div className="alert alert-warning" role="alert">
      <span className="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>&nbsp;
      {children}
    </div>
  );
};

export const Button = ({ label, type, onClick, disabled, additionalStyles, icon }) => {
  const classes =
    'btn btn-' + (type ? type : 'default') + (additionalStyles ? ' ' + additionalStyles : '');
  return (
    <button type="button" className={classes} onClick={onClick} disabled={disabled}>
      {icon && (
        <>
          <i className={icon}></i>
        </>
      )}
      <span> {label}</span>
    </button>
  );
};

export const Checkbox = ({ label, id, value, onChange }) => {
  return (
    <label htmlFor={id}>
      <input type="checkbox" id={id} checked={value} onChange={onChange} /> {label}
    </label>
  );
};

export const LineEdit = ({ placeholder, value }) => {
  return <input className="form-control" type="text" placeholder={placeholder} value={value} />;
};

export const FormEdit = observer(({ name, error, description, children }) => {
  return (
    <BootstrapRow>
      <div className={error ? 'form-group col-md-12 has-error' : 'form-group col-md-12'}>
        <label className="control-label">{name}</label>
        {children}
        {description && <p className="help-block">{description}</p>}
        {error && <p className="help-block errormsg">{error}</p>}
      </div>
    </BootstrapRow>
  );
});

export const FormStringEdit = observer(({ store }) => {
  return (
    <FormEdit name={store.name} error={store.error} description={store.description}>
      <input
        className="form-control"
        type="text"
        value={store.value}
        placeholder={store.placeholder}
        onChange={e => store.setValue(e.target.value)}
      />
    </FormEdit>
  );
});

export const FormCheckbox = observer(({ store }) => {
  return (
    <BootstrapRow>
      <div className="col-md-12">
        <Checkbox
          id={store.id}
          label={store.name}
          value={store.value}
          onChange={e => store.setValue(e.target.checked)}
        />
      </div>
    </BootstrapRow>
  );
});
