import { ReactElement } from 'react';

export interface ColumnsWrapperProps<T> {
  items: T[];
  renderItem: (_item: T, _index: number) => ReactElement;
  panelWidth: number;
  columnClassName?: string;
}
