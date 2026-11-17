export interface TextareaProps {
  id?: string;
  size?: 'default' | 'small';
  value: string;
  className?: string;
  autoFocus?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isWithExplicitChanges?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  ariaDescribedby?: string;
  ariaErrorMessage?: string;
  onChange: (_val: string) => void;
}
