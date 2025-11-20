import classNames from 'classnames';
import { lazy, type PropsWithChildren, Suspense } from 'react';
import { type AlertProps } from './types';
import './styles.css';

const InfoIcon = lazy(() => import('@/assets/icons/info.svg'));
const SuccessIcon = lazy(() => import('@/assets/icons/success.svg'));
const DangerIcon = lazy(() => import('@/assets/icons/danger.svg'));
const WarnIcon = lazy(() => import('@/assets/icons/warn.svg'));

export const Alert = ({
  children, className, size = 'default', variant = 'info', withIcon = true, ...rest
}: PropsWithChildren<AlertProps>) => (
  <div
    role="alert"
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
        {(variant === 'info' || variant === 'gray') && <InfoIcon className="alertMessage-icon" />}
        {(variant === 'warn') && <WarnIcon className="alertMessage-icon" />}
        {(variant === 'danger') && <DangerIcon className="alertMessage-icon" />}
        {(variant === 'success') && <SuccessIcon className="alertMessage-icon" />}
      </Suspense>
    )}
    <div className="alertMessage-content">{children}</div>
  </div>
);
