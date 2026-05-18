import type { HTMLAttributes, LazyExoticComponent, ReactElement } from 'react';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'info' | 'success' | 'warn' | 'danger' | 'gray';
  size?: 'default' | 'small';
  withIcon?: boolean;
  icon?: ReactElement | LazyExoticComponent<any>;
  onClose?: () => void;
}
