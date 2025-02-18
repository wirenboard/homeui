export interface RangeProps {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  units?: string;
  isDisabled: boolean;
  ariaLabel?: string;
  onChange: (_val: number) => void;
}
