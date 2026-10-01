import classNames from 'classnames';
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { type TextareaProps } from './types';
import './styles.css';

export const Textarea = ({
  value,
  className,
  isDisabled,
  isInvalid,
  isWithExplicitChanges,
  onChange,
  size = 'default',
  ariaLabel,
  ariaInvalid,
  ariaDescribedby,
  ariaErrorMessage,
  ...rest
}: TextareaProps) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const inputMethod = useRef<'keyboard' | 'mouse' | 'unknown'>('unknown');

  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  const handleBlurOrChange = () => {
    if (onChange && internalValue !== value) {
      onChange(internalValue);
    }
  };

  const handleKeyDown = (ev: KeyboardEvent<HTMLTextAreaElement>): void => {
    inputMethod.current = 'keyboard';
    if (ev.key === 'Enter') {
      handleBlurOrChange();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      setInternalValue(value);
    }
  };

  const handleOnChange = (ev: ChangeEvent<HTMLTextAreaElement>): void => {
    setInternalValue(ev.target.value);
    if (!isWithExplicitChanges || inputMethod.current === 'mouse') {
      if (onChange) {
        onChange(ev.target.value);
      }
    }
  };

  return (
    <textarea
      className={classNames('textarea', className, {
        'textarea-m': size === 'default',
        'textarea-s': size === 'small',
        'textarea-invalid': isInvalid,
      })}
      disabled={isDisabled}
      value={internalValue}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedby}
      aria-errormessage={ariaErrorMessage}
      onChange={handleOnChange}
      onBlur={handleBlurOrChange}
      onKeyDown={handleKeyDown}
      {...rest}
    />
  );
};
