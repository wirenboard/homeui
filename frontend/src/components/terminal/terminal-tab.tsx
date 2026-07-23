import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import classNames from 'classnames';
import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from 'xterm';
import RefreshIcon from '@/assets/icons/refresh.svg';
import { ConsoleIconButton } from '@/components/console-panel/console-icon-button';
import { consolePanelStore } from '@/stores/console-panel';
import { MobileKeyboardPanel } from './mobile-keyboard-panel';
import { terminalStore } from './terminal-store';
import { TerminalConnectionState } from './types';
import 'xterm/css/xterm.css';
import './styles.css';

function createTerminal() {
  return new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: '\'JetBrains Mono\', \'Fira Code\', \'Cascadia Code\', Menlo, Monaco, monospace',
    theme: {
      background: '#1e1e1e',
      cursor: '#d4d4d4',
      selectionBackground: '#264f78',
    },
    scrollback: 10000,
    convertEol: true,
    allowProposedApi: true,
  });
}

export const TerminalContent = observer(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const dispose = reaction(
      () => consolePanelStore.isVisible && consolePanelStore.activeTabId === 'terminal',
      (isActive) => {
        if (isActive && !terminalRef.current) {
          const terminal = createTerminal();
          const fitAddon = new FitAddon();
          const webLinksAddon = new WebLinksAddon();

          terminal.loadAddon(fitAddon);
          terminal.loadAddon(webLinksAddon);
          terminal.open(container);
          fitAddon.fit();

          terminal.onData((data) => {
            terminalStore.sendInput(data);
          });

          terminal.onResize(({ cols, rows }) => {
            terminalStore.sendResize(cols, rows);
          });

          terminalStore.onData((data) => {
            terminal.write(data);
          });

          terminalStore.onReconnect(() => {
            terminal.reset();
          });

          terminalStore.onConnected(() => {
            if (fitAddonRef.current) {
              fitAddonRef.current.fit();
            }
            terminal.focus();
          });

          terminalRef.current = terminal;
          fitAddonRef.current = fitAddon;
          terminalStore.setTerminal(terminal);

          terminalStore.connect();
        } else if (!isActive && terminalRef.current) {
          terminalStore.disconnect();
          terminalStore.setTerminal(null);
          terminalRef.current.dispose();
          terminalRef.current = null;
          fitAddonRef.current = null;
        }
      },
      { fireImmediately: true },
    );

    return () => {
      dispose();
      terminalStore.disconnect();
      terminalStore.setTerminal(null);
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (fitAddonRef.current && terminalRef.current) {
          try {
            fitAddonRef.current.fit();
          } catch {}
        }
      }, 50);
    });
    ro.observe(container);

    return () => {
      clearTimeout(resizeTimer);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className="terminal-container" />
      <MobileKeyboardPanel />
    </>
  );
});

export const TerminalToolbar = observer(() => {
  const { t } = useTranslation();
  const { connectionState } = terminalStore;

  const statusKey = {
    [TerminalConnectionState.Connected]: 'connected',
    [TerminalConnectionState.Connecting]: 'connecting',
    [TerminalConnectionState.Disconnected]: 'disconnected',
    [TerminalConnectionState.Error]: 'error',
  }[connectionState];

  return (
    <div className="terminal-toolbar">
      <span className="terminal-status">
        <span className={classNames('terminal-statusDot', `terminal-statusDot--${statusKey}`)} />
        {t(`terminal.status.${statusKey}`)}
      </span>
      <ConsoleIconButton
        icon={RefreshIcon}
        tooltip={t('terminal.buttons.reconnect')}
        onClick={() => terminalStore.connect()}
      />
    </div>
  );
});
