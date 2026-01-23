import { type ButtonHTMLAttributes, type ReactElement } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  label?: string;
  icon?: ReactElement;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'unaccented' | 'warn';
  size?: 'default' | 'small' | 'large';
  isLoading?: boolean;
  isOutlined?: boolean;
}
