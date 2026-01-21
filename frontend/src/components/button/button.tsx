import classNames from 'classnames';
import { Loader } from '@/components/loader';
import { type ButtonProps } from './types';
import './styles.css';

export const Button = ({
  className, type, icon, label, isOutlined, isLoading, size = 'default', variant = 'primary', ...rest
}: ButtonProps) => (
  <button
    type={type || 'button'}
    className={classNames('button', className, {
      'button-l': size === 'large',
      'button-m': size === 'default',
      'button-s': size === 'small',
      'button-primary': variant === 'primary',
      'button-secondary': variant === 'secondary',
      'button-danger': variant === 'danger',
      'button-unaccented': variant === 'unaccented',
      'button-warn': variant === 'warn',
      'button-outlined': isOutlined,
    })}
    {...rest}
  >
    {isLoading && <Loader className="button-loader" />}
    {!!icon && (
      <span
        className={classNames('button-icon', { 'button-loading': isLoading })}
        aria-hidden="true"
      >
        {icon}
      </span>
    )}
    {!!label && <span className={classNames('button-text', { 'button-loading': isLoading })}>{label}</span>}
  </button>
);
