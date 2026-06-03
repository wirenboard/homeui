import type { ButtonHTMLAttributes, ReactElement } from 'react';
import { type LinkProps } from 'react-router-dom';

interface CommonButtonProps {
  className?: string;
  label?: string;
  icon?: ReactElement;
  variant?: 'primary' | 'secondary' | 'danger' | 'unaccented' | 'warn';
  size?: 'default' | 'small' | 'large';
  isLoading?: boolean;
  isOutlined?: boolean;
}

export type ButtonProps = CommonButtonProps & ButtonHTMLAttributes<HTMLButtonElement>;
export type ButtonLinkProps = CommonButtonProps & LinkProps;
