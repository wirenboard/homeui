import { useVirtualizer } from '@tanstack/react-virtual';
import type { ConsoleLogRow, ConsoleLogScrollerProps } from './types';
import { useConsoleAutoScroll } from './use-console-auto-scroll';

/**
 * Scrollable, auto-scrolling log region shared by every console tab's content.
 * Renders only the rows in view (plus a small overscan), so the work per
 * appended line does not grow with the buffer size. Real row heights are
 * measured, so rows may wrap or span multiple lines.
 */
export const ConsoleLogScroller = <T extends ConsoleLogRow>(
  { scrollKey, items, estimateRowHeight, header, renderRow }: ConsoleLogScrollerProps<T>,
) => {
  const { scrollRef, onScroll } = useConsoleAutoScroll(scrollKey);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 8,
  });

  return (
    <div
      className="consolePanel-content"
      ref={scrollRef}
      role="log"
      aria-live="polite"
      onScroll={onScroll}
    >
      {header}
      <div className="consolePanel-rows" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(({ index, start }) => (
          <div
            key={items[index].seq}
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
