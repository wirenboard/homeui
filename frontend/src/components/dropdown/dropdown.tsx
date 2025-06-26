import classNames from 'classnames';
import Select, { components } from 'react-select';
import { DropdownProps } from './types';
import './styles.css';

const DropdownIndicator = (props: any) => {
  return (
    <components.DropdownIndicator {...props}>
      <components.DownChevron size={18} />
    </components.DropdownIndicator>
  );
};

export const Dropdown = ({
  id,
  options,
  className,
  value,
  placeholder,
  size = 'default',
  ariaLabel,
  isDisabled,
  isSearchable = false,
  minWidth = '150px',
  onChange,
}: DropdownProps) => {
  const getClassNames = (className: string) => classNames(className, {
    'dropdown-m': size === 'default',
    'dropdown-s': size === 'small',
  });

  const MenuPortal = (props: any) => (
    <components.MenuPortal{...props} className={getClassNames(props.className)} />
  );

  return (
    <Select
      inputId={id}
      className={getClassNames(className)}
      classNamePrefix="dropdown"
      options={options}
      value={options.find((option) => option.value === value)}
      placeholder={placeholder || ''}
      isDisabled={isDisabled}
      isSearchable={isSearchable}
      isClearable={false}
      menuPortalTarget={document.body}
      menuPlacement="auto"
      components={{
        MenuPortal,
        DropdownIndicator,
      }}
      aria-label={ariaLabel}
      styles={{
        control: (baseStyles, _state) => ({
          ...baseStyles,
          minWidth,
        }),
      }}
      unstyled
      onChange={onChange}
    />
  );
};
