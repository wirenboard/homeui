export interface SwitchProps {
  id: string;
  value: boolean;
  className?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  ariaLabel?: string;
  onChange: (_val: boolean) => void;
}
