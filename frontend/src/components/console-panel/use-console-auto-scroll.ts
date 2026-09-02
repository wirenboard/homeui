import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Keeps a scrollable log container pinned to the bottom as new entries arrive,
 * unless the user has scrolled up. `scrollKey` must change on every append:
 * dropping an entry off the top of a capped buffer moves scrollTop (browser
 * scroll anchoring), so the container drifts up by one row per entry on its own.
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
