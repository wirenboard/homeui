import { type CollapseButtonState } from './collapse-button-state';

export interface CollapseButtonProps {
  className?: string;
  state: CollapseButtonState;
  stopPropagation?: boolean;
}
