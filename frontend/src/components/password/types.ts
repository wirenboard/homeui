import { LegacyRef } from 'react';

export interface PasswordProps {
  id?: string;
  ref?: LegacyRef<HTMLInputElement>;
  size?: 'default' | 'small' | 'large';
  value: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  autoFocus?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  ariaDescribedby?: string;
  ariaInvalid?: boolean;
  ariaErrorMessage?: string;
  isFullWidth?: boolean;
  isWithExplicitChanges?: boolean;
  showIndicator?: boolean;
  onChange: (_val: string | number, _badInput?: boolean) => void;
  onChangeEvent: (_val: any) => void;
}
