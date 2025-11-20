import { type Placement } from '@floating-ui/react';
import { type ReactElement } from 'react';

export interface TooltipProps {
  className?: string;
  text: string | ReactElement;
  trigger?: 'hover' | 'click';
  placement?: Placement;
  closeOnClick?: boolean;
}
