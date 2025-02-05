import { FC, SVGProps } from 'react';

export interface CardAction {
  title: string;
  action: (_args: unknown | unknown[]) => void;
  icon: FC<SVGProps<SVGSVGElement>>;
}

export interface CardProps {
  id?: string;
  heading: string;
  actions?: CardAction[];
  toggleBody?: () => void;
  isBodyVisible?: boolean;
}
