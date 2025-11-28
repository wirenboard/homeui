import { type AlertProps } from '@/components/alert/types';

export interface Notification {
  id?: Symbol;
  text: string;
  variant?: AlertProps['variant'];
  timeout?: number;
}
