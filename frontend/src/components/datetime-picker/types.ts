export interface DateTimePickerProps {
  value?: Date | null;
  size?: 'default' | 'small';
  disabled?: boolean;
  ariaLabel?: string;
  isInvalid?: boolean;
  withSeconds?: boolean;
  onChange?: (_date: Date | null) => void;
}
