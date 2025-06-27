import classNames from 'classnames';
import { KeyboardEvent, useEffect, useState } from 'react';
import { TextareaProps } from './types';
import './styles.css';

export const Textarea = ({
  value,
  className,
  isDisabled,
  onChange,
  size = 'default',
  ariaLabel,
  ...rest
}: TextareaProps) => {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleBlurOrChange = () => {
    if (onChange && internalValue !== value) {
      onChange(internalValue);
    }
  };

  const handleKeyDown = (ev: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (ev.key === 'Enter') {
      handleBlurOrChange();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      setInternalValue(value);
    }
  };

  return (
    <textarea
      className={classNames('textarea', className, {
        'textarea-m': size === 'default',
        'textarea-s': size === 'small',
      })}
      disabled={isDisabled}
      value={internalValue}
      aria-label={ariaLabel}
      onChange={(ev) => setInternalValue(ev.target.value)}
      onBlur={handleBlurOrChange}
      onKeyDown={handleKeyDown}
      {...rest}
    />
  );
};
