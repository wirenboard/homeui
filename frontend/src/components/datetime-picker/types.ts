import { type Matcher } from 'react-day-picker';

export interface DateTimePickerProps {
  id?: string;
  className?: string;
  value?: Date | null;
  size?: 'default' | 'small';
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  disabledDates?: Matcher | Matcher[];
  isInvalid?: boolean;
  withSeconds?: boolean;
  onChange?: (_date: Date | null) => void;
}
