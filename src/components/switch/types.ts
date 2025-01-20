export interface SwitchProps {
  id: string;
  value: boolean;
  isDisabled: boolean;
  ariaLabel?: string;
  onChange: (_val: boolean) => void;
}
