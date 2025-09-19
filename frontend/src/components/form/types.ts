export interface FormFieldProps {
  description?: string;
  error?: string;
  defaultText?: string;
  descriptionId?: string;
  errorId?: string;
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
  title: string;
  value: string;
  description?: string;
  placeholder?: string;
  error?: string;
  defaultText?: string;
  isDisabled?: boolean;
  autoComplete?: 'username' | 'new-password' | 'current-password' | 'off';
  required?: boolean;
  onChange: (value: string) => void;
}

export interface BooleanFieldProps {
  title: string;
  value: boolean;
  description?: string;
  error?: string;
  isDisabled?: boolean;
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
  options: { label: string; value: T }[];
  isDisabled?: boolean;
  isSearchable?: boolean;
  onChange: (value: T) => void;
}
