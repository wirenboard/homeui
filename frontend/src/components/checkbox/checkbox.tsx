import classNames from 'classnames';
import { ChangeEvent } from 'react';
import { CheckboxProps } from './types';
import './styles.css';

export const Checkbox = ({
  checked,
  title,
  indeterminate,
  className,
  onChange,
}: CheckboxProps) => {
  const handleOnChange = (ev: ChangeEvent<HTMLInputElement>): void => {
    onChange(ev.target.checked);
  };
  return (
    <label className={classNames('wb-checkbox', className)}>
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) {
            el.indeterminate = !!indeterminate;
          }
        }}
        onChange={handleOnChange}
      />
      {title}
    </label>
  );
};
