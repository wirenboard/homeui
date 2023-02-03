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
          <i className={icon}></i>&nbsp;
        </>
      )}
      <span>{label}</span>
    </button>
  );
};
