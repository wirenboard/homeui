export interface SwitchProps {
  id?: string;
  value: boolean;
  className?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  ariaInvalid?: boolean;
  ariaErrorMessage?: string;
  onChange: (_val: boolean) => void;
}
