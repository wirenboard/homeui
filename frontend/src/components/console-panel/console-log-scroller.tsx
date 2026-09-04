import { useVirtualizer } from '@tanstack/react-virtual';
import { type UIEvent, useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { ConsoleLogRow, ConsoleLogScrollerProps } from './types';

/**
 * Virtualized log region shared by the console tabs. Stays pinned to the bottom
 * until the user scrolls up. Scrolled up, the rows in view stay put while a full
 * buffer drops rows off the top, only the scrollbar moves.
 */
export const ConsoleLogScroller = <T extends ConsoleLogRow>(
  { scrollKey, items, estimateRowHeight, header, renderRow }: ConsoleLogScrollerProps<T>,
) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stuckToBottom, setStuckToBottom] = useState(true);
  // A new `getItemKey` makes the virtualizer recompute every row position, and `items` is rebuilt each render.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const getItemKey = useCallback((index: number) => itemsRef.current[index].seq, []);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    getItemKey,
    anchorTo: 'end',
    overscan: 8,
  });

  // Measured rows grow the content in a second render, hence `totalSize`. Layout effect, placed after
  // `useVirtualizer` and its anchoring, so the browser never sees a short position that reads as scrolled up.
  const totalSize = virtualizer.getTotalSize();
  useLayoutEffect(() => {
    if (stuckToBottom) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [scrollKey, totalSize, stuckToBottom]);

  const onScroll = ({ currentTarget }: UIEvent<HTMLDivElement>) => {
    setStuckToBottom(currentTarget.scrollHeight - currentTarget.scrollTop - currentTarget.clientHeight < 5);
  };

  return (
    <div
      className="consolePanel-content"
      ref={scrollRef}
      role="log"
      aria-live="polite"
      onScroll={onScroll}
    >
      {header}
      <div className="consolePanel-rows" style={{ height: totalSize }}>
        {virtualizer.getVirtualItems().map(({ index, key, start }) => (
          <div
            key={key}
            data-index={index}
            ref={virtualizer.measureElement}
            className="consolePanel-rowSlot"
            style={{ transform: `translateY(${start}px)` }}
          >
            {renderRow(items[index])}
          </div>
        ))}
      </div>
    </div>
  );
};
