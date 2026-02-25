import classNames from 'classnames';
import { type ChangeEvent, useEffect, useRef } from 'react';
import { Button } from '@/components/button';
import { type CheckboxProps } from './types';
import './styles.css';

export const Checkbox = ({
  checked,
  title,
  indeterminate,
  className,
  ariaDescribedby,
  ariaInvalid,
  ariaErrorMessage,
  variant = 'default',
  onChange,
}: CheckboxProps) => {
  const checkboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);
  const handleOnChange = (ev: ChangeEvent<HTMLInputElement>): void => {
    onChange(ev.target.checked);
  };
  if (variant === 'button') {
    return (
      <Button
        label={title}
        aria-pressed={checked}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
        aria-errormessage={ariaErrorMessage}
        variant={checked ? 'primary' : 'unaccented'}
        onClick={() => onChange(!checked)}
      />
    );
  }
  return (
    <label className={classNames('wb-checkbox', className)}>
      <input
        type="checkbox"
        checked={checked}
        ref={checkboxRef}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
        aria-errormessage={ariaErrorMessage}
        onChange={handleOnChange}
      />
      {title}
    </label>
  );
};
