import classNames from 'classnames';
import { useRef } from 'react';
import Select, { components, type SelectInstance } from 'react-select';
import PlusIcon from '@/assets/icons/plus.svg';
import type { DropdownProps, Option } from './types';
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
  isDisabled,
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

  const findOption = (options: Option<unknown>[], value: unknown) => {
    let res;
    options.find((option) => {
      if (option?.options) {
        res = option.options.find((option) => option.value === value);
        return !!res;
      }
      if (option.value === value) {
        res = option;
        return true;
      }
      return false;
    });
    return res;
  };

  return (
    <Select
      ref={select}
      inputId={id}
      className={classNames(getClassNames(className, size), {
        'dropdown-button': isButton,
        'dropdown-invalid': isInvalid,
      })}
      classNamePrefix="dropdown"
      options={options}
      value={findOption(options, value)}
      placeholder={placeholder || ''}
      isDisabled={isDisabled}
      isSearchable={isSearchable}
      isClearable={false}
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
        option: (provided, { data }) => {
          if (data?.hidden) {
            provided.display = 'none';
          }
          return provided;
        },
      }}
      unstyled
      onChange={handleChange}
    />
  );
};
