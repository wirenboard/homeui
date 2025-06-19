export interface CheckboxProps {
  checked: boolean;
  title?: string;
  indeterminate?: boolean;
  className?: string;
  onChange: (checked: boolean) => void;
}
