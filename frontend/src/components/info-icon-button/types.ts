import type { Placement } from '@floating-ui/react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

interface InfoIconTooltipProps {
  tooltip?: string;
  tooltipPlacement?: Placement;
}

export type InfoIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & InfoIconTooltipProps;
export type InfoIconLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & InfoIconTooltipProps;
