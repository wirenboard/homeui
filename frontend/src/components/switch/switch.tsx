import { SwitchProps } from './types';
import './styles.css';

export const Switch = ({
  value, id, isDisabled, onChange = () => {}, ariaLabel,
}: SwitchProps) => (
  <label
    htmlFor={id}
    className="toggle-switchy"
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
