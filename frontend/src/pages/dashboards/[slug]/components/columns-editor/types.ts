import { type ReactNode } from 'react';

export interface ColumnsEditorProps {
  columns: string[][];
  columnCount: number | null;
  maxColumns: number;
  renderWidget: (widgetId: string) => ReactNode;
  onChange: (columns: string[][], columnCount: number | null) => void;
}
