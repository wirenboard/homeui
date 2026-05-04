import { type CSSProperties } from 'react';
import { type Option } from '@/components/dropdown';

export interface FormFieldProps {
  description?: string;
  error?: string;
  defaultText?: string;
  descriptionId?: string;
  errorId?: string;
  style?: CSSProperties;
}

export interface FieldLabelProps {
  title: string;
  inputId?: string;
}

export interface FieldDescriptionProps {
  id?: string;
  description?: string;
  defaultText?: string;
}

export interface FieldErrorProps {
  id?: string;
  error: string;
}

export interface StringFieldProps {
  title?: string;
  value: string | number;
  description?: string;
  placeholder?: string;
  error?: string;
  type?: 'text' | 'number';
  view?: 'input' | 'textarea';
  defaultText?: string;
  isDisabled?: boolean;
  autoComplete?: 'username' | 'new-password' | 'current-password' | 'off';
  required?: boolean;
  autoFocus?: boolean;
  formStyle?: CSSProperties;
  onChange: (value: string | number) => void;
}

export interface PasswordFieldProps extends StringFieldProps {
  showIndicator?: boolean;
  value: string;
}

export interface BooleanFieldProps {
  title: string;
  value: boolean;
  view?: 'switch' | 'checkbox';
  description?: string;
  error?: string;
  isDisabled?: boolean;
  formStyle?: CSSProperties;
  onChange: (value: boolean) => void;
}

export interface FieldGroupProps {
  heading?: string;
}

export interface OptionsFieldProps<T = string | boolean | number | null | unknown> {
  title: string;
  value: T;
  description?: string;
  error?: string;
  options: Option[];
  isDisabled?: boolean;
  placeholder?: string;
  isSearchable?: boolean;
  isClearable?: boolean;
  formStyle?: CSSProperties;
  onChange: (value: T) => void;
}
