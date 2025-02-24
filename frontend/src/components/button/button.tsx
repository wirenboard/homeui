import classNames from 'classnames';
import { ButtonProps } from './types';
import './styles.css';

export const Button = ({
  className, type, icon, label, size = 'default', variant = 'primary', ...rest
}: ButtonProps) => (
  <button
    type={type || 'button'}
    className={classNames('button', className, {
      'button-m': size === 'default',
      'button-s': size === 'small',
      'button-primary': variant === 'primary',
      'button-success': variant === 'success',
      'button-secondary': variant === 'secondary',
      'button-danger': variant === 'danger',
    })}
    {...rest}
  >
    {!!icon && <span className="button-icon" aria-hidden="true">{icon}</span>}
    {label}
  </button>
);
