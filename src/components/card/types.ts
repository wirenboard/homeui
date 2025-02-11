import { FC, ReactElement, SVGProps } from 'react';

export interface CardAction {
  title: string;
  action?: (_args: unknown | unknown[]) => void;
  url?: (_id?: string) => string;
  icon: FC<SVGProps<SVGSVGElement>>;
}

export interface CardProps {
  id?: string;
  className?: string;
  heading: string | ReactElement;
  actions?: CardAction[];
  toggleBody?: () => void;
  isBodyVisible?: boolean;
}
