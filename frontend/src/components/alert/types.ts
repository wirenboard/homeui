import type { FC, HTMLAttributes, ReactElement } from 'react';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'info' | 'success' | 'warn' | 'danger' | 'gray';
  size?: 'default' | 'small';
  withIcon?: boolean;
  icon?: ReactElement | FC<any>;
  onClose?: () => void;
}
