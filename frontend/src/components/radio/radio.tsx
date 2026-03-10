import { useId } from 'react';
import { type RadioProps } from './types';
import './styles.css';

export const Radio = ({ checked, isDisabled, onChange, label, ariaLabel, name }: RadioProps) => {
  const id = useId();

  return (
    <label className="radio" htmlFor={id}>
      <input
        type="radio"
        aria-label={ariaLabel}
        id={id}
        name={name}
        checked={checked}
        disabled={isDisabled}
        onChange={(ev) => onChange(ev.target.checked)}
      />
      {label}
    </label>
  );
};
