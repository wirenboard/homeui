import { observer } from 'mobx-react-lite';
import FocusLock from 'react-focus-lock';
import React, { useRef, useEffect } from 'react';

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

// modals

export const ModalHeader = ({ children }) => {
  return <div className="modal-header">{children}</div>;
};

export const ModalBody = ({ children }) => {
  return <div className="modal-body">{children}</div>;
};

export const ModalFooter = ({ children }) => {
  return <div className="modal-footer">{children}</div>;
};

export const ModalTitle = ({ id, text }) => {
  return (
    <h4 className="modal-title" id={GetLabelId(id)}>
      {text}
    </h4>
  );
};

const GetLabelId = (modalId) => {
  return modalId + 'Label';
}

export const Modal = ({ id, active, onCancel, children }) => {
  // The idea is taken from https://usehooks.com/useOnClickOutside
  const ref = useRef();
  useEffect(() => {
    if (active) {
      const handleClick = event => {
        if (ref && ref.current && !ref.current.contains(event.target)) {
          onCancel();
        }
      };
      const handleEsc = event => {
        if (event.key === 'Escape') {
          onCancel();
        }
      };
      document.addEventListener('keydown', handleEsc, true);
      document.addEventListener('mousedown', handleClick, true);
      document.addEventListener('touchstart', handleClick, true);
      var backdrop = document.createElement('div');
      backdrop.classList.add('modal-backdrop');
      backdrop.classList.add('in');
      document.body.appendChild(backdrop);
      document.body.classList.add('modal-open');
      return () => {
        document.removeEventListener('keydown', handleEsc, true);
        document.removeEventListener('mousedown', handleClick, true);
        document.removeEventListener('touchstart', handleClick, true);
        document.body.removeChild(backdrop);
        document.body.classList.remove('modal-open');
      };
    }
  }, [ref, active, onCancel]);

  return (
    <div
      className={active ? 'modal in' : 'modal'}
      id={id}
      tabIndex="-1"
      role="dialog"
      aria-labelledby={GetLabelId(id)}
      style={{ display: active ? 'block' : 'none' }}
    >
      <div ref={ref} className="modal-dialog" role="document">
        <FocusLock disabled={!active}>
          <div className="modal-content">{children}</div>
        </FocusLock>
      </div>
    </div>
  );
};
