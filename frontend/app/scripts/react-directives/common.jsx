import { useId } from 'react';

export const BootstrapRow = ({ children, additionalStyles }) => {
  const classes = 'row' + (additionalStyles ? ' ' + additionalStyles : '');
  return <div className={classes}>{children}</div>;
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

export const ErrorPanel = ({ className, children }) => {
  const classes = 'alert alert-danger' + (className ? ' ' + className : '');
  return (
    <div className={classes} role="alert" style={{ whiteSpace: 'pre-wrap' }}>
      {children}
    </div>
  );
};

export const ErrorSign = () => {
  return <span className="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>;
};

export const ErrorHeader = ({ children }) => {
  return (
    <div className="alert-header">
      <ErrorSign />
      &nbsp;
      {children}
    </div>
  );
};

export const ErrorBar = ({ msg, children }) => {
  if (!msg) {
    return null;
  }
  return (
    <ErrorPanel>
      <ErrorHeader>
        <span>{msg}</span>
      </ErrorHeader>
      {children}
    </ErrorPanel>
  );
};

export const Button = ({ label, type, onClick, disabled, additionalStyles, icon, title, submit }) => {
  const classes =
    'btn btn-' + (type ? type : 'default') + (additionalStyles ? ' ' + additionalStyles : '');
  return (
    <button
      type={submit ? 'submit' : 'button'}
      className={classes}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
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
        <input type="checkbox" id={id} checked={value} disabled={disabled} onChange={onChange} />
        {label}
      </label>
    </div>
  );
};
