import classNames from 'classnames';
import { SwitchProps } from './types';
import './styles.css';

export const Switch = ({
  value, id, className, isDisabled, isInvalid, onChange = () => {}, ariaLabel,
}: SwitchProps) => (
  <label
    htmlFor={id}
    className={classNames('toggle-switchy', className, {
      'toggle-switchy-invalid': isInvalid,
    })}
    onClick={(ev) => {
      ev.stopPropagation();
    }}
  >
    <input
      id={id}
      type="checkbox"
      checked={value}
      disabled={isDisabled}
      aria-label={ariaLabel}
      onChange={() => onChange(!value)}
    />
    <span className="toggle">
      <span className="switch" />
    </span>
  </label>
);
