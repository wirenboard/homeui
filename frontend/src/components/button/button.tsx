import classNames from 'classnames';
import { ButtonProps } from './types';
import './styles.css';

export const Button = ({
  className, type, icon, label, isOutlined, size = 'default', variant = 'primary', ...rest
}: ButtonProps) => (
  <button
    type={type || 'button'}
    className={classNames('button', className, {
      'button-l': size === 'large',
      'button-m': size === 'default',
      'button-s': size === 'small',
      'button-primary': variant === 'primary',
      'button-success': variant === 'success',
      'button-secondary': variant === 'secondary',
      'button-danger': variant === 'danger',
      'button-unaccented': variant === 'unaccented',
      'button-outlined': isOutlined,
    })}
    {...rest}
  >
    {!!icon && <span className="button-icon" aria-hidden="true">{icon}</span>}
    {!!label && <span className="button-text">{label}</span>}
  </button>
);
