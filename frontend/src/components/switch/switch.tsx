import classNames from 'classnames';
import { useId } from 'react';
import SwitchCheckIcon from '@/assets/icons/switch-check.svg';
import SwitchMinusIcon from '@/assets/icons/switch-minus.svg';
import { type SwitchProps } from './types';
import './styles.css';

export const Switch = ({
  value,
  id,
  className,
  isDisabled,
  isInvalid,
  onChange = () => {},
  ariaLabel,
  ariaLabelledby,
  ariaDescribedby,
  ariaInvalid,
  ariaErrorMessage,
}: SwitchProps) => {
  const idToUse = id ?? useId();
  return (
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
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
        aria-errormessage={ariaErrorMessage}
        onChange={() => onChange(!value)}
      />
      <span className="toggle">
        <span className="switch">
          {value ? <SwitchCheckIcon className="switch-icon" /> : <SwitchMinusIcon className="switch-icon" />}
        </span>
      </span>
    </label>
  );
};
