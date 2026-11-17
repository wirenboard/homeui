import { type ReactNode } from 'react';

export interface ColumnsWrapperProps {
  baseColumnWidth: number;
  columnClassName?: string;
  columnCount?: number;
  columnItems?: ReactNode[][];
}
