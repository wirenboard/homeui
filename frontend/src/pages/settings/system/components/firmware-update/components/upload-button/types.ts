import type { ButtonProps } from '@/components/button';

export interface UploadButtonProps {
  label: string;
  variant: ButtonProps['variant'];
  onClick: () => void;
  disabled?: boolean;
}
