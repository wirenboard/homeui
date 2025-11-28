import classNames from 'classnames';
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { type InputProps } from './types';
import './styles.css';

export const Input = ({
  value,
  className,
  isDisabled,
  isWithExplicitChanges,
  onChange,
  onChangeEvent,
  type = 'text',
  isFullWidth = false,
  isInvalid,
  size = 'default',
  ariaLabel,
  ariaDescribedby,
  ariaInvalid,
  ariaErrorMessage,
  ...rest
}: InputProps) => {
  const [internalValue, setInternalValue] = useState(value);
  const inputMethod = useRef<'keyboard' | 'mouse' | 'unknown'>('unknown');

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleBlurOrChange = () => {
    if (onChange && internalValue !== value) {
      onChange(internalValue);
    }
  };

  const handleKeyDown = (ev: KeyboardEvent<HTMLInputElement>): void => {
    inputMethod.current = 'keyboard';
    if (ev.key === 'Enter') {
      handleBlurOrChange();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      setInternalValue(value);
    }
  };

  const handleOnChange = (ev: ChangeEvent<HTMLInputElement>): void => {
    setInternalValue(ev.target.value);
    if (!isWithExplicitChanges || inputMethod.current === 'mouse') {
      if (onChange) {
        onChange(ev.target.value);
      }
      if (onChangeEvent) {
        onChangeEvent(ev);
      }
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
        'input-invalid': isInvalid,
      })}
      disabled={isDisabled}
      value={internalValue}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      aria-invalid={ariaInvalid}
      aria-errormessage={ariaErrorMessage}
      onChange={handleOnChange}
      onBlur={handleBlurOrChange}
      onKeyDown={handleKeyDown}
      onKeyUp={() => {
        inputMethod.current = 'unknown';
      }}
      onMouseDown={() => {
        inputMethod.current = 'mouse';
      }}
      onMouseUp={() => {
        inputMethod.current = 'unknown';
      }}
      {...rest}
    />
  );
};
