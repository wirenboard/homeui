export interface ColorpickerProps {
  id: string;
  value: string;
  isDisabled: boolean;
  ariaLabel?: string;
  onChange: (_val: string) => void;
}
