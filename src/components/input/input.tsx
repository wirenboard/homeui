import classNames from 'classnames';
import { KeyboardEvent, useEffect, useState } from 'react';
import { InputProps } from './types';
import './styles.css';

export const Input = ({
  value, id, className, isDisabled, placeholder, onChange, type = 'text', min, max, step, size = 'default', ariaLabel,
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

  return (
    <input
      id={id}
      type={type}
      className={classNames('input', className, {
        'input-m': size === 'default',
        'input-s': size === 'small',
      })}
      disabled={isDisabled}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      value={internalValue}
      aria-label={ariaLabel}
      onChange={(ev) => setInternalValue(ev.target.value)}
      onBlur={handleBlurOrChange}
      onKeyDown={handleKeyDown}
    />
  );
};
