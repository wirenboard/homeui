export interface TextareaProps {
  id?: string;
  size?: 'default' | 'small';
  value: string;
  className?: string;
  autoFocus?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  onChange: (_val: string) => void;
}
