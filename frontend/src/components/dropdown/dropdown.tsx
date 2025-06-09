import classNames from 'classnames';
import Select from 'react-select';
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
  isSearchable,
  onChange,
}: DropdownProps) => (
  <Select
    inputId={id}
    className={classNames(className, {
      'dropdown-m': size === 'default',
      'dropdown-s': size === 'small',
    })}
    classNamePrefix="dropdown"
    options={options}
    value={options.find((option) => option.value === value)}
    placeholder={placeholder || ''}
    isDisabled={isDisabled}
    isSearchable={isSearchable}
    isClearable={false}
    aria-label={ariaLabel}
    unstyled
    onChange={onChange}
  />
);
