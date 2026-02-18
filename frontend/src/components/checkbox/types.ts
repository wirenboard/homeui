export interface CheckboxProps {
  checked: boolean;
  title?: string;
  indeterminate?: boolean;
  className?: string;
  ariaDescribedby?: string;
  ariaInvalid?: boolean;
  ariaErrorMessage?: string;
  variant?: 'default' | 'button';
  onChange: (checked: boolean) => void;
}
