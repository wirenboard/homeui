import classNames from 'classnames';
import Select from 'react-select';
import { DropdownProps } from './types';
import './styles.css';

export const Dropdown = ({
  options,
  className,
  value,
  placeholder,
  multiselect,
  isClearable,
  isLoading,
  isSearchable,
  isDisabled,
  size = 'default',
  ariaLabel,
  onChange,
}: DropdownProps) => (
  <Select
    className={classNames(className, {
      'dropdown-m': size === 'default',
      'dropdown-s': size === 'small',
    })}
    classNamePrefix="dropdown"
    options={options}
    value={options.find((option) => option.value === value)}
    placeholder={placeholder || ''}
    isSearchable={isSearchable}
    aria-label={ariaLabel}
    isMulti={multiselect}
    isClearable={isClearable}
    isLoading={isLoading}
    isDisabled={isDisabled}
    unstyled
    onChange={onChange}
  />
);
