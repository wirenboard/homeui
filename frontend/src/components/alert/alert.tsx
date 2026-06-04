import classNames from 'classnames';
import { type PropsWithChildren } from 'react';
import CloseIcon from '@/assets/icons/close.svg';
import DangerIcon from '@/assets/icons/danger.svg';
import InfoIcon from '@/assets/icons/info.svg';
import SuccessIcon from '@/assets/icons/success.svg';
import WarnIcon from '@/assets/icons/warn.svg';
import { Button } from '@/components/button';
import { type AlertProps } from './types';
import './styles.css';

export const Alert = ({
  children, className, size = 'default', variant = 'info', withIcon = true, icon, onClose, ...rest
}: PropsWithChildren<AlertProps>) => {
  const Icon = () => {
    let Component;

    switch (variant) {
      case 'danger':
        Component = DangerIcon;
        break;
      case 'success':
        Component = SuccessIcon;
        break;
      case 'warn':
        Component = WarnIcon;
        break;
      case 'info':
      case 'gray':
      default:
        Component = InfoIcon;
    }

    if (icon) {
      Component = icon;
    }

    return (
      <Component className="alertMessage-icon" />
    );
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={classNames('alertMessage', className, {
        'alertMessage-m': size === 'default',
        'alertMessage-s': size === 'small',
        'alertMessage-info': variant === 'info',
        'alertMessage-success': variant === 'success',
        'alertMessage-warn': variant === 'warn',
        'alertMessage-danger': variant === 'danger',
        'alertMessage-gray': variant === 'gray',
      })}
      {...rest}
    >
      {withIcon && (
        <Icon />
      )}
      <div className="alertMessage-content">{children}</div>
      {!!onClose && (
        <Button
          className="alertMessage-close"
          icon={<CloseIcon className="alertMessage-closeIcon" />}
          isOutlined
          onClick={onClose}
        />
      )}
    </div>
  );
};
