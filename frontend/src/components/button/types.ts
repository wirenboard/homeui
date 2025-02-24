import { ButtonHTMLAttributes, ReactElement } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  label?: string;
  icon?: ReactElement;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'default' | 'small';
}
