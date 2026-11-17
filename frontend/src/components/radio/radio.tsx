import classNames from 'classnames';
import { useId } from 'react';
import { type RadioProps } from './types';
import './styles.css';

export const Radio = ({
  checked, isDisabled, onChange, label, description, ariaLabel, name,
}: RadioProps) => {
  const id = useId();

  return (
    <label
      className={classNames('radio', { 'radio-withDescription': description })}
      htmlFor={id}
    >
      <input
        type="radio"
        aria-label={ariaLabel}
        id={id}
        name={name}
        checked={checked}
        disabled={isDisabled}
        onChange={(ev) => onChange(ev.target.checked)}
      />
      {description ? (
        <span className="radio-content">
          <span className="radio-label">{label}</span>
          <span className="radio-description">{description}</span>
        </span>
      ) : (
        label
      )}
    </label>
  );
};
