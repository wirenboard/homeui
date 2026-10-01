import { type ReactNode } from 'react';

export interface OptionsItemProps {
  isModified: boolean;
  children: ReactNode;
}

export interface OptionsPopupProps {
  ariaLabel: string;
  modifiedCount: number;
  children: ReactNode;
}
