import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConsoleTab } from '@/stores/console-panel';

interface ConsolePanelContentProps {
  tab: ConsoleTab;
  filter: string;
}

export const ConsolePanelContent = observer(({ tab, filter }: ConsolePanelContentProps) => {
  const content = useRef<HTMLDivElement>(null);
  const [isStopAutoScroll, setIsStopAutoScroll] = useState(false);

  const handleScroll = useCallback(() => {
    if (!content.current) return;
    const { scrollHeight, scrollTop, clientHeight } = content.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 5;
    setIsStopAutoScroll(!atBottom);
  }, []);

  const logs = tab.getLogs();

  useEffect(() => {
    if (content.current && !isStopAutoScroll) {
      content.current.scrollTo({ top: content.current.scrollHeight });
    }
  }, [isStopAutoScroll, logs.length]);

  const filteredLogs = tab.filterLevels && tab.getLogLevel && filter !== 'all'
    ? logs.filter((log) => tab.getLogLevel(log) === filter)
    : logs;

  return (
    <div
      className="consolePanel-content"
      ref={content}
      role="log"
      aria-live="polite"
      onScroll={handleScroll}
    >
      {filteredLogs.map((log, i) => tab.renderLog(log, i))}
    </div>
  );
});
