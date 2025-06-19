import classNames from 'classnames';
import Select, { components } from 'react-select';
import { DropdownProps } from './types';
import './styles.css';

const DropdownIndicator = (props) => {
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
  isSearchable,
  minWidth = '150px',
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
    components={{ DropdownIndicator }}
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
