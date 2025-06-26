import classNames from 'classnames';
import { ChangeEvent, useEffect, useRef } from 'react';
import { CheckboxProps } from './types';
import './styles.css';

export const Checkbox = ({
  checked,
  title,
  indeterminate,
  className,
  onChange,
}: CheckboxProps) => {
  const checkboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    checkboxRef.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  const handleOnChange = (ev: ChangeEvent<HTMLInputElement>): void => {
    onChange(ev.target.checked);
  };
  return (
    <label className={classNames('wb-checkbox', className)}>
      <input
        type="checkbox"
        checked={checked}
        ref={checkboxRef}
        onChange={handleOnChange}
      />
      {title}
    </label>
  );
};
