import classNames from 'classnames';
import { ButtonProps } from './types';
import './styles.css';

export const Button = ({
  className, type, label, size = 'default', variant = 'primary', ...rest
}: ButtonProps) => (
  <button
    type={type || 'button'}
    className={classNames('button', className, {
      'button-m': size === 'default',
      'button-s': size === 'small',
      'button-primary': variant === 'primary',
      'button-secondary': variant === 'secondary',
      'button-danger': variant === 'danger',
    })}
    {...rest}
  >
    {label}
  </button>
);
