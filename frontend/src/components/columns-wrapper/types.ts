import { ReactElement } from 'react';

export interface ColumnsWrapperProps<T> {
  /**
   * Array of items to be displayed in multiple columns.
   * The component automatically splits this array into columns based on container width.
   */
  items: T[];
  /**
   * Render function that defines how each item should be displayed.
   */
  renderItem: (_item: T, _index: number) => ReactElement;
  /**
   * Base width (in pixels) used to calculate how many columns fit in the container.
   * This value is not a strict minimum — actual column width may be larger or shorter,
   * since the available space is evenly distributed between all columns.
   */
  baseColumnWidth: number;
  columnClassName?: string;
}
