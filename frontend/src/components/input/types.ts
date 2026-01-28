import { type LegacyRef } from 'react';
import type { RequireAtLeastOne } from '@/utils/types';

interface BaseInputProps {
  id?: string;
  ref?: LegacyRef<HTMLInputElement>;
  type?: 'text' | 'number' | 'password';
  size?: 'default' | 'small' | 'large';
  value: string | number;
  name?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  autoFocus?: boolean;
  isDisabled?: boolean;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  ariaLabel?: string;
  ariaDescribedby?: string;
  ariaInvalid?: boolean;
  ariaErrorMessage?: string;
  isFullWidth?: boolean;
  isInvalid?: boolean;
  isWithExplicitChanges?: boolean;
  onChange?: (_val: string | number, _badInput?: boolean) => void;
  onBlur?: (_ev: any) => void;
  onChangeEvent?: (_ev: any) => void;
}

export type InputProps = RequireAtLeastOne<BaseInputProps, 'onChange' | 'onChangeEvent'>;
