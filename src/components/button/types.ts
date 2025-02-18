import { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'small';
}
