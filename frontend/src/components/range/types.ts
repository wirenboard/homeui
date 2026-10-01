export type RangeLabelPosition = 'bottom' | 'right' | 'none';

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
  // Fires continuously while the thumb is being dragged (on every `input` event),
  // unlike `onChange` which only fires on release. Use it for live readouts that
  // should track the thumb without committing the value on every pixel.
  onLiveChange?: (_val: number) => void;
}
