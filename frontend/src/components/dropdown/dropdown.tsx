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
    isClearable={false}
    value={options.find((option) => option.value === value)}
    placeholder={placeholder || ''}
    isSearchable={false}
    aria-label={ariaLabel}
    isDisabled={isDisabled}
    unstyled
    onChange={onChange}
  />
);
