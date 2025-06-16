import classNames from 'classnames';
import Select, { components } from 'react-select';
import { DropdownProps } from './types';
import './styles.css';

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
      }}
      aria-label={ariaLabel}
      unstyled
      onChange={onChange}
    />
  );
};
