import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { MobileKeyboardPanel } from './mobile-keyboard-panel';
import { TerminalNoticePanel, TerminalReconnectBanner, TerminalStopBanner } from './terminal-banners';
import { terminalView } from './terminal-view';
import './styles.css';

export const TerminalContent = observer(() => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    terminalView.attach(container);

    // The terminal and its connection outlive this component.
    return () => terminalView.detach();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => terminalView.fit(), 50);
    });
    ro.observe(container);

    return () => {
      clearTimeout(resizeTimer);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      <TerminalStopBanner />
      <TerminalReconnectBanner />
      <TerminalNoticePanel />
      <div ref={containerRef} className="terminal-container" />
      <MobileKeyboardPanel />
    </>
  );
});
