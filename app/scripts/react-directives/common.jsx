import React from 'react';
import { useId } from 'react';

export const WarningTag = ({ text }) => {
  return <span className="tag bg-warning text-nowrap">{text}</span>;
};

export const ErrorTag = ({ text }) => {
  return <span className="tag bg-danger text-nowrap">{text}</span>;
};

export const BootstrapRow = ({ children, additionalStyles }) => {
  const classes = 'row' + (additionalStyles ? ' ' + additionalStyles : '');
  return <div className={classes}>{children}</div>;
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

export const ErrorBar = ({ msg, children }) => {
  if (!msg) {
    return null;
  }
  return (
    <div className="alert alert-danger" role="alert" style={{ whiteSpace: 'pre-wrap' }}>
      <div className="alert-header">
        <span className="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>
        <span className="alert-text"> {msg}</span>
      </div>
      {children}
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

export const Button = ({ label, type, onClick, disabled, additionalStyles, icon, title }) => {
  const classes =
    'btn btn-' + (type ? type : 'default') + (additionalStyles ? ' ' + additionalStyles : '');
  return (
    <button type="button" className={classes} onClick={onClick} disabled={disabled} title={title}>
      {icon && (
        <>
          <i className={icon}></i>
        </>
      )}
      <span> {label}</span>
    </button>
  );
};

export const Checkbox = ({ label, value, onChange, disabled }) => {
  const id = useId();
  return (
    <div className="checkbox">
      <label htmlFor={id} disabled={disabled}>
        <input type="checkbox" id={id} checked={value} onChange={onChange} disabled={disabled} />
        {label}
      </label>
    </div>
  );
};

export const LineEdit = React.forwardRef(({ placeholder, value, onChange }, ref) => {
  return (
    <input
      ref={ref}
      className="form-control"
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  );
});

export const Radio = ({ label, id, value, onChange }) => {
  return (
    <label className="radio-inline" htmlFor={id}>
      <input type="radio" id={id} checked={value} onChange={e => onChange?.(e.target.checked)} />
      {label}
    </label>
  );
};
