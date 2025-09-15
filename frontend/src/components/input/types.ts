import { LegacyRef } from 'react';

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Keys extends keyof T
    ? Required<Pick<T, Keys>> & Omit<T, Keys>
    : never;

type BaseInputProps = {
  id?: string;
  ref?: LegacyRef<HTMLInputElement>;
  type?: 'text' | 'number' | 'password';
  size?: 'default' | 'small' | 'large';
  value: string | number;
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
  isInvalid?: boolean;
  isWithExplicitChanges?: boolean;
  onChange?: (_val: string | number, _badInput?: boolean) => void;
  onChangeEvent?: (_ev: any) => void;
};

export type InputProps = RequireAtLeastOne<BaseInputProps, 'onChange' | 'onChangeEvent'>;
