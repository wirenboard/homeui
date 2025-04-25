import { ButtonHTMLAttributes } from 'react';

export interface ToggleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  label?: string;
  enabled: boolean;
}
