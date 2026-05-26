import classNames from 'classnames';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const Placeholder = (props: any) => (
  <components.Placeholder {...props} innerProps={{ ...props.innerProps, 'aria-hidden': true }}>
    {props.selectProps?.placeholder}
  </components.Placeholder>
);

const SingleValue = (props: any) => (
  <components.SingleValue {...props} innerProps={{ ...props.innerProps, 'aria-hidden': true }}>
    {props.children}
  </components.SingleValue>
);

const MenuPortal = (props: any, size: DropdownProps['size']) => (
  <components.MenuPortal{...props} className={getClassNames(props.className, size)} />
);

const NoOptionsMessage = (props: any, message: string = '') => {
  return (
    <components.NoOptionsMessage {...props}>
      <span className="custom-css-class">{message}</span>
    </components.NoOptionsMessage>
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
  multiselect,
  isDisabled,
  isLoading,
  isInvalid,
  isClearable = false,
  isSearchable = false,
  noOptionsMessage,
  isButton,
  minWidth = '150px',
  onChange,
}: DropdownProps) => {
  const { t } = useTranslation();
  const select = useRef<SelectInstance>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const inputId = id ?? useId();

  const handleChange = (option) => {
    if (isButton && option) {
      setTimeout(() => {
        select.current?.clearValue();
      });
    }
    onChange(option);
  };

  const handleKeyDown = (ev) => {
    if (ev.key === 'Enter' && !isMenuOpen) {
      ev.preventDefault();
      select.current.openMenu('first');
    }
    if (ev.key === 'Escape' && isMenuOpen) {
      ev.stopPropagation();
    }
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
    <div style={{ display: 'contents' }} onTouchEndCapture={(ev) => ev.stopPropagation()}>
      <Select
        ref={select}
        inputId={inputId}
        className={classNames(getClassNames(className, size), {
          'dropdown-button': isButton,
          'dropdown-invalid': isInvalid,
          'dropdown-m': size === 'default',
          'dropdown-s': size === 'small',
        })}
        classNamePrefix="dropdown"
        options={options}
        value={findOption(options, value)}
        placeholder={placeholder || ''}
        isDisabled={isDisabled}
        isSearchable={isSearchable}
        isLoading={isLoading}
        isClearable={isClearable}
        isMulti={multiselect}
        menuPortalTarget={document.body}
        menuPlacement="auto"
        maxMenuHeight={240}
        menuPosition="fixed"
        components={{
          MenuPortal: (props) => MenuPortal({ ...props, className }, size),
          DropdownIndicator: (props) => DropdownIndicator(props, isButton),
          NoOptionsMessage: (props) => NoOptionsMessage(props, noOptionsMessage),
          Placeholder: (props) => Placeholder(props),
          SingleValue: (props) => SingleValue(props),
        }}
        aria-label={ariaLabel || placeholder}
        styles={{
          control: (baseStyles, _state) => ({
            ...baseStyles,
            minWidth,
          }),
          option: (baseStyles, { data }) => ({
            ...baseStyles,
            display: data?.hidden ? 'none' : baseStyles.display,
          }),
        }}
        tabSelectsValue={false}
        noOptionsMessage={() => t('common.labels.empty-search')}
        unstyled
        onMenuOpen={() => setIsMenuOpen(true)}
        onMenuClose={() => setIsMenuOpen(false)}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
      />
    </div>
  );
};
