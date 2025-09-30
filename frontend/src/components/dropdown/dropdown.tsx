import classNames from 'classnames';
import { useRef } from 'react';
import Select, { components, type SelectInstance } from 'react-select';
import PlusIcon from '@/assets/icons/plus.svg';
import type { DropdownProps } from './types';
import './styles.css';

const DropdownIndicator = (props: any, isButton: boolean) => (
  <components.DropdownIndicator {...props}>
    {isButton ? <PlusIcon className="dropdown-icon" /> : <components.DownChevron size={18} />}
  </components.DropdownIndicator>
);

const getClassNames = (className: string, size: DropdownProps['size']) => classNames(className, {
  'dropdown-m': size === 'default',
  'dropdown-s': size === 'small',
});

const MenuPortal = (props: any, size: DropdownProps['size']) => (
  <components.MenuPortal{...props} className={getClassNames(props.className, size)} />
);

export const Dropdown = ({
  id,
  options,
  className,
  value,
  placeholder,
  size = 'default',
  ariaLabel,
  multiselect,
  isDisabled,
  isLoading,
  isClearable,
  isInvalid,
  isSearchable = false,
  isButton,
  minWidth = '150px',
  onChange,
}: DropdownProps) => {
  const select = useRef<SelectInstance>();

  const handleChange = (option) => {
    if (isButton && option) {
      setTimeout(() => {
        select.current.clearValue();
      });
    }
    onChange(option);
  };

  return (
    <Select
      ref={select}
      inputId={id}
      className={classNames(getClassNames(className, size), {
        'dropdown-button': isButton,
        'dropdown-invalid': isInvalid,
        'dropdown-m': size === 'default',
        'dropdown-s': size === 'small',
      })}
      classNamePrefix="dropdown"
      options={options}
      value={options.find((option) => option.value === value)}
      placeholder={placeholder || ''}
      isDisabled={isDisabled}
      isSearchable={isSearchable}
      isMulti={multiselect}
      isLoading={isLoading}
      isClearable={isClearable}
      menuPortalTarget={document.body}
      menuPlacement="auto"
      maxMenuHeight={240}
      menuPosition="fixed"
      components={{
        MenuPortal: (props) => MenuPortal(props, size),
        DropdownIndicator: (props) => DropdownIndicator(props, isButton),
      }}
      aria-label={ariaLabel}
      styles={{
        control: (baseStyles, _state) => ({
          ...baseStyles,
          minWidth,
        }),
      }}
      unstyled
      onChange={handleChange}
    />
  );
};
