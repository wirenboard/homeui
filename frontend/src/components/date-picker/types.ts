export interface DatePickerProps {
  className?: string;
  value: Date;
  placeholder?: string;
  heading: string;
  onChange: (_val: Date | null) => void;
}
