import { type HTMLAttributes } from 'react';

export interface TagProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'primary' | 'success' | 'warn' | 'danger' | 'gray';
}
