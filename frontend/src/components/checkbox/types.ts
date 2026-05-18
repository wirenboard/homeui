export interface CheckboxProps {
  id?: string;
  checked: boolean;
  title?: string;
  indeterminate?: boolean;
  className?: string;
  ariaDescribedby?: string;
  ariaLabel?: string;
  isDisabled?: boolean;
  ariaInvalid?: boolean;
  ariaErrorMessage?: string;
  variant?: 'default' | 'button';
  onChange: (checked: boolean) => void;
}
