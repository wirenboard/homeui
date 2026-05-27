import classNames from 'classnames';
import { useEffect, useRef, useState, useCallback, Children, type ReactNode, type PropsWithChildren } from 'react';
import type { ColumnsWrapperProps } from './types';
import './styles.css';

const SCROLLBAR_WIDTH = 20;

export function ColumnsWrapper({ children, baseColumnWidth, columnClassName }: PropsWithChildren<ColumnsWrapperProps>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<ReactNode[][]>([]);
  const prevCountRef = useRef(0);

  const splitIntoColumns = useCallback(
    (containerWidth: number, list: ReactNode[]) => {
      let count = Math.max(1, Math.floor(containerWidth / baseColumnWidth));

      const prevCount = prevCountRef.current;
      if (count === prevCount - 1 && Math.floor((containerWidth + SCROLLBAR_WIDTH) / baseColumnWidth) >= prevCount) {
        count = prevCount;
      }
      prevCountRef.current = count;

      const result = Array.from({ length: count }, () => [] as ReactNode[]);
      list.forEach((item, i) => result[i % count].push(item));
      setColumns(result);
    },
    [baseColumnWidth],
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

  return (
    <div className="columnsWrapper-container" ref={wrapperRef}>
      {columns.map((columnWithContent, i) => (
        <div className={classNames('columnsWrapper-column', columnClassName)} key={i}>
          {columnWithContent}
        </div>
      ))}
    </div>
  );
}
