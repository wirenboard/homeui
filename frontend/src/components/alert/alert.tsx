import classNames from 'classnames';
import { lazy, type PropsWithChildren, Suspense } from 'react';
import CloseIcon from '@/assets/icons/close.svg';
import { Button } from '@/components/button';
import { type AlertProps } from './types';
import './styles.css';

const InfoIcon = lazy(() => import('@/assets/icons/info.svg'));
const SuccessIcon = lazy(() => import('@/assets/icons/success.svg'));
const DangerIcon = lazy(() => import('@/assets/icons/danger.svg'));
const WarnIcon = lazy(() => import('@/assets/icons/warn.svg'));

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
        <Suspense fallback={<div className="alertMessage-icon" />}>
          <Icon />
        </Suspense>
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
