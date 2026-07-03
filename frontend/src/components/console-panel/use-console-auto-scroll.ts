import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Keeps a scrollable log container pinned to the bottom as new entries arrive,
 * unless the user has scrolled up. `scrollKey` should change whenever the
 * rendered set of entries changes (typically its length).
 */
export const useConsoleAutoScroll = (scrollKey: number | string) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stuckToBottom, setStuckToBottom] = useState(true);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 5;
    setStuckToBottom(atBottom);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stuckToBottom) {
      el.scrollTo({ top: el.scrollHeight });
    }
  }, [scrollKey, stuckToBottom]);

  return { scrollRef, onScroll };
};
