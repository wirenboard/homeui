import { useEffect, useState, type RefObject } from 'react';

export const MIN_COLUMN_WIDTH = 320;

export function useMaxColumns(
  containerRef: RefObject<HTMLElement>,
  hasContent: boolean,
  minColumnWidth: number = MIN_COLUMN_WIDTH,
): number {
  const [maxColumns, setMaxColumns] = useState(4);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setMaxColumns(Math.max(1, Math.floor(el.clientWidth / minColumnWidth)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasContent, minColumnWidth]);

  return maxColumns;
}
