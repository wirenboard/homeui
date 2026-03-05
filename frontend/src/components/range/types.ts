export type RangeLabelPosition = 'bottom' | 'right';

export interface RangeProps {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  units?: string;
  formatLabel?: (value: number) => string;
  isInvalid?: boolean;
  isDisabled: boolean;
  ariaLabel?: string;
  labelPosition?: RangeLabelPosition;
  onChange: (_val: number) => void;
}
