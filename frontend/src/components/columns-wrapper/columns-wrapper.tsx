import classNames from 'classnames';
import { useEffect, useRef, useState, useCallback, Children, type ReactNode, type PropsWithChildren } from 'react';
import type { ColumnsWrapperProps } from './types';
import './styles.css';

const SCROLLBAR_WIDTH = 20;

function mergeColumns(columnItems: ReactNode[][], maxCount: number): ReactNode[][] {
  if (columnItems.length <= maxCount) {
    return columnItems;
  }
  const merged: ReactNode[][] = Array.from({ length: maxCount }, () => []);
  columnItems.forEach((col, i) => merged[i % maxCount].push(...col));
  return merged;
}

export function ColumnsWrapper({
  children,
  baseColumnWidth,
  columnClassName,
  columnCount,
  columnItems,
}: PropsWithChildren<ColumnsWrapperProps>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<ReactNode[][]>([]);
  const [actualCount, setActualCount] = useState(1);
  const prevCountRef = useRef(0);

  const splitIntoColumns = useCallback(
    (containerWidth: number, list: ReactNode[]) => {
      let count = Math.max(1, Math.floor(containerWidth / baseColumnWidth));

      const prevCount = prevCountRef.current;
      if (count === prevCount - 1 && Math.floor((containerWidth + SCROLLBAR_WIDTH) / baseColumnWidth) >= prevCount) {
        count = prevCount;
      }

      if (columnCount !== undefined) {
        count = columnCount;
      }

      prevCountRef.current = count;
      setActualCount(count);

      if (columnItems) {
        setColumns(mergeColumns(columnItems, count));
        return;
      }

      const result = Array.from({ length: count }, () => [] as ReactNode[]);
      list.forEach((item, i) => result[i % count].push(item));
      setColumns(result);
    },
    [baseColumnWidth, columnCount, columnItems],
  );

  const recalc = useCallback(() => {
    const width = wrapperRef.current?.clientWidth ?? 0;
    splitIntoColumns(width, Children.toArray(children));
  }, [splitIntoColumns, children]);

  useEffect(() => {
    recalc();

    const observer = new ResizeObserver(() => recalc());
    if (wrapperRef.current) observer.observe(wrapperRef.current);

    return () => observer.disconnect();
  }, [recalc]);

  const gridStyle = { gridTemplateColumns: `repeat(${actualCount}, 1fr)` };

  return (
    <div className="columnsWrapper-container" style={gridStyle} ref={wrapperRef}>
      {columns.map((columnWithContent, i) => (
        <div className={classNames('columnsWrapper-column', columnClassName)} key={i}>
          {columnWithContent}
        </div>
      ))}
    </div>
  );
}
