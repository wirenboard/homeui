import { useId, forwardRef } from 'react';

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

export const WarningPanel = ({ className, children }) => {
  const classes = 'alert alert-warning' + (className ? ' ' + className : '');
  return (
    <div className={classes} role="alert">
      {children}
    </div>
  );
};

const WarningSign = () => {
  return <span className="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>;
};

export const WarningHeader = ({ children }) => {
  return (
    <div className="alert-header">
      <WarningSign />
      &nbsp;
      {children}
    </div>
  );
};

export const WarningBar = ({ children }) => {
  return (
    <WarningPanel>
      <WarningHeader>{children}</WarningHeader>
    </WarningPanel>
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

export const LineEdit = forwardRef(
  ({ placeholder, value, onChange, disabled, type, name, required, autocomplete }, ref) => {
    return (
      <input
        ref={ref}
        className="form-control"
        type={type || 'text'}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        name={name}
        required={required}
        autoComplete={autocomplete}
        onChange={onChange}
      />
    );
  }
);

export const Radio = ({ label, id, value, onChange }) => {
  return (
    <label className="radio-inline" htmlFor={id}>
      <input type="radio" id={id} checked={value} onChange={(e) => onChange?.(e.target.checked)} />
      {label}
    </label>
  );
};
