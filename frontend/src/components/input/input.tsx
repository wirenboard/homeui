import classNames from 'classnames';
import { ChangeEvent, KeyboardEvent, useEffect, useState } from 'react';
import { InputProps } from './types';
import './styles.css';

export const Input = ({
  value,
  className,
  isDisabled,
  isWithExplicitChanges,
  onChange,
  type = 'text',
  isFullWidth = false,
  size = 'default',
  ariaLabel,
  ...rest
}: InputProps) => {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleBlurOrChange = () => {
    if (onChange && internalValue !== value) {
      onChange(internalValue);
    }
  };

  const handleKeyDown = (ev: KeyboardEvent<HTMLInputElement>): void => {
    if (ev.key === 'Enter') {
      handleBlurOrChange();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      setInternalValue(value);
    }
  };

  const handleOnChange = (ev: ChangeEvent<HTMLInputElement>): void => {
    setInternalValue(ev.target.value);
    if (!isWithExplicitChanges) {
      onChange(ev.target.value);
    }
  };

  return (
    <input
      type={type}
      className={classNames('input', className, {
        'input-l': size === 'large',
        'input-m': size === 'default',
        'input-s': size === 'small',
        'input-fullWidth': isFullWidth,
      })}
      disabled={isDisabled}
      value={internalValue}
      aria-label={ariaLabel}
      onChange={handleOnChange}
      onBlur={handleBlurOrChange}
      onKeyDown={handleKeyDown}
      {...rest}
    />
  );
};
