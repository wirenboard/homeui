import Select from 'react-select';
import { DropdownProps } from './types';
import './styles.css';

export const Dropdown = ({
  options,
  className,
  value,
  placeholder,
  size = 'default',
  ariaLabel,
  onChange,
}: DropdownProps) => (
  <Select
    className={`${className || ''}
     ${size === 'default' ? 'dropdown-m' : ''}
      ${size === 'small' ? 'dropdown-s' : ''}`}
    classNamePrefix="dropdown"
    options={options}
    isClearable={false}
    value={options.find((option: any) => option.value === value)}
    placeholder={placeholder || ''}
    isSearchable={false}
    aria-label={ariaLabel}
    unstyled
    onChange={onChange}
  />
);
