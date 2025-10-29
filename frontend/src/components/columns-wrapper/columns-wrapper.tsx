import classNames from 'classnames';
import { useEffect, useRef, useState, useCallback, Children, type ReactNode, type PropsWithChildren } from 'react';
import type { ColumnsWrapperProps } from './types';
import './styles.css';

export function ColumnsWrapper({ children, baseColumnWidth, columnClassName }: PropsWithChildren<ColumnsWrapperProps>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<ReactNode[][]>([]);

  const splitIntoColumns = useCallback(
    (containerWidth: number, list: ReactNode[]) => {
      const count = Math.max(1, Math.floor(containerWidth / baseColumnWidth));
      const result = Array.from({ length: count }, () => [] as ReactNode[]);
      list.forEach((item, i) => result[i % count].push(item));
      setColumns(result);
    },
    [baseColumnWidth]
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
