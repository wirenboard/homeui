export interface InputProps {
  id?: string;
  type?: 'text' | 'number';
  size?: 'default' | 'small';
  value: string | number;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  autoFocus?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  isFullWidth?: boolean;
  isWithExplicitChanges?: boolean;
  onChange: (_val: string | number) => void;
}
