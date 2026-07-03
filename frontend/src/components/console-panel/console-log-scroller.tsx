import type { ConsoleLogScrollerProps } from './types';
import { useConsoleAutoScroll } from './use-console-auto-scroll';

/** Scrollable, auto-scrolling log region shared by every console tab's content. */
export const ConsoleLogScroller = ({ scrollKey, children }: ConsoleLogScrollerProps) => {
  const { scrollRef, onScroll } = useConsoleAutoScroll(scrollKey);

  return (
    <div
      className="consolePanel-content"
      ref={scrollRef}
      role="log"
      aria-live="polite"
      onScroll={onScroll}
    >
      {children}
    </div>
  );
};
