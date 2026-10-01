export interface ColorpickerProps {
  id: string;
  value: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  ariaLabel?: string;
  onChange: (_val: string) => void;
}
