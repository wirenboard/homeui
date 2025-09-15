export interface RangeProps {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  units?: string;
  isInvalid?: boolean;
  isDisabled: boolean;
  ariaLabel?: string;
  onChange: (_val: number) => void;
}
