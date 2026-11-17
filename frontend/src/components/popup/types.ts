import { type Placement } from '@floating-ui/react';
import { type ReactNode } from 'react';

export interface PopupProps {
  className?: string;
  content: ReactNode;
  isOpen: boolean;
  onOpenChange: (_isOpen: boolean) => void;
  placement?: Placement;
}
