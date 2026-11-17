import classNames from 'classnames';
import { type ToggleButtonProps } from './types';
import './styles.css';

export const ToggleButton = ({ className, label, enabled, ...rest }: ToggleButtonProps) => (
  <button
    type="button"
    className={classNames('toggleButton', className, {
      'toggleButton-active': enabled,
    })}
    {...rest}
  >
    {label}
  </button>
);
