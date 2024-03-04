import React from 'react';
import Select from 'react-select';

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

export const Checkbox = ({ label, id, value, onChange }) => {
  return (
    <div className="checkbox">
      <label htmlFor={id}>
        <input type="checkbox" id={id} checked={value} onChange={onChange} /> {label}
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

export const BootstrapLikeSelect = ({
  options,
  selectedOption,
  placeholder,
  onChange,
  isClearable,
  hasErrors,
  className,
}) => {
  const withGroups = options.some(el => 'options' in el);
  const borderColor = hasErrors ? '#b94a48' : '#ccc';
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
    option: (provided, { data }) => {
      if (withGroups) {
        provided.paddingLeft = '20px';
      }
      if (data?.hidden) {
        provided.display = 'none';
      }
      return provided;
    },
  };
  return (
    <Select
      options={options}
      isSearchable={true}
      isClearable={isClearable}
      value={selectedOption}
      styles={customStyles}
      placeholder={placeholder}
      onChange={onChange}
      className={className}
    />
  );
};
