export interface CheckboxProps {
  checked: boolean;
  title?: string;
  indeterminate?: boolean;
  className?: string;
  ariaDescribedby?: string;
  ariaInvalid?: boolean;
  ariaErrorMessage?: string;
  onChange: (checked: boolean) => void;
}
