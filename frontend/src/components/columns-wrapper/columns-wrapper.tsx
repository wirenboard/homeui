import classNames from 'classnames';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { ColumnsWrapperProps } from './types';
import './styles.css';

export function ColumnsWrapper<T>({
  items,
  renderItem,
  baseColumnWidth,
  columnClassName,
}: ColumnsWrapperProps<T>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<T[][]>([]);

  const splitIntoColumns = useCallback(
    (containerWidth: number, list: T[]) => {
      const count = Math.max(1, Math.floor(containerWidth / baseColumnWidth));
      const result = Array.from({ length: count }, () => [] as T[]);
      list.forEach((item, i) => result[i % count].push(item));
      setColumns(result);
    },
    [baseColumnWidth]
  );

  const recalc = useCallback(() => {
    const width = wrapperRef.current?.clientWidth ?? 0;
    splitIntoColumns(width, items);
  }, [splitIntoColumns, items]);

  useEffect(() => {
    recalc();

    const observer = new ResizeObserver(() => recalc());
    if (wrapperRef.current) observer.observe(wrapperRef.current);

    return () => observer.disconnect();
  }, [recalc]);

  return (
    <div className="columnsWrapper-container" ref={wrapperRef}>
      {columns.map((col, i) => (
        <div className={classNames('columnsWrapper-column', columnClassName)} key={i}>
          {col.map((item, j) => renderItem(item, j))}
        </div>
      ))}
    </div>
  );
}
