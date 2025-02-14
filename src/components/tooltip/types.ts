import { Placement } from '@floating-ui/react';
import { ReactElement } from 'react';

export interface TooltipProps {
  text: string | ReactElement;
  trigger?: 'hover' | 'click';
  placement?: Placement;
}
