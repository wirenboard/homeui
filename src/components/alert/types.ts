import { ButtonHTMLAttributes } from 'react';

export interface AlertProps extends ButtonHTMLAttributes<HTMLDivElement>{
  className?: string;
  variant?: 'info' | 'success' | 'warn' | 'danger' | 'gray';
  size?: 'default' | 'small';
  withIcon?: boolean;
}
