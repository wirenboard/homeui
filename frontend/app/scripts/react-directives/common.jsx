import { useId, forwardRef } from 'react';
import { Password } from '@/components/password';

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

export const Button = ({ label, type, onClick, disabled, additionalStyles, icon, ariaHasPopup, title, submit }) => {
  const classes =
    'btn btn-' + (type ? type : 'default') + (additionalStyles ? ' ' + additionalStyles : '');
  return (
    <button
      type={submit ? 'submit' : 'button'}
      className={classes}
      disabled={disabled}
      title={title}
      aria-haspopup={ariaHasPopup ? 'dialog' : null}
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
  ({ placeholder, value, onChange, disabled, type, name, required, autocomplete, showIndicator, labelId, descriptionId }, ref) => {
    console.log(labelId)
    if (type === 'textarea') {
      return (
        <textarea
          ref={ref}
          className="form-control"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          name={name}
          required={required}
          autoComplete={autocomplete}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          onChange={onChange}
        />
      );
    } else if (type === 'password') {
      return (
        <Password
          ref={ref}
          className="form-control"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          name={name}
          required={required}
          autoComplete={autocomplete}
          showIndicator={showIndicator}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          isFullWidth
          onChangeEvent={onChange}
        />
      );
    } else {
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
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          onChange={onChange}
        />
      );
    }
  }
);
