import classNames from 'classnames';
import { type SwitchProps } from './types';
import './styles.css';
import { useId } from 'react';

export const Switch = ({
  value,
  id,
  className,
  isDisabled,
  isInvalid,
  onChange = () => {},
  ariaLabel,
  ariaDescribedby,
  ariaInvalid,
  ariaErrorMessage,
}: SwitchProps) => {
  const idToUse = id ?? useId();
  return(
  <label
    htmlFor={idToUse}
    className={classNames('toggle-switchy', className, {
      'toggle-switchy-invalid': isInvalid,
    })}
    onClick={(ev) => {
      ev.stopPropagation();
    }}
  >
    <input
      id={idToUse}
      type="checkbox"
      checked={value}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      aria-invalid={ariaInvalid}
      aria-errormessage={ariaErrorMessage}
      onChange={() => onChange(!value)}
    />
    <span className="toggle">
      <span className="switch" />
    </span>
  </label>
)};
