import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';
import { terminalStore } from './terminal-store';
import { TerminalConnectionState } from './types';
import '@xterm/xterm/css/xterm.css';

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

const IME_PROCESS_KEY_CODE = 229;

/**
 * An IME that is on but not composing (IBus in Firefox) sends each key as a keydown with keyCode 229
 * followed by an `insertText` input. xterm ignores that input and only compares the textarea after a
 * zero timeout, which often fires before the text arrives, so the key is lost (an xterm.js bug).
 * If xterm has not sent the text by the end of the `input` event, it is sent here and the textarea value
 * is restored, so the timeout sees no change and does not send it again.
 */
function sendTextXtermDrops(terminal: Terminal) {
  const textarea = terminal.textarea;
  let imeKeysPending = 0;
  let valueBeforeInput = '';
  let sentByXterm = false;

  terminal.onData(() => {
    sentByXterm = true;
  });
  textarea.addEventListener('keydown', (event) => {
    if (event.keyCode === IME_PROCESS_KEY_CODE && !event.isComposing) {
      imeKeysPending++;
    }
  });
  textarea.addEventListener('beforeinput', () => {
    valueBeforeInput = textarea.value;
    sentByXterm = false;
  });
  // Registered after xterm's own listener, so `sentByXterm` already covers this event.
  textarea.addEventListener('input', (event: InputEvent) => {
    if (!imeKeysPending || event.inputType !== 'insertText' || event.isComposing || !event.data) {
      return;
    }
    imeKeysPending--;
    if (sentByXterm) {
      return;
    }
    textarea.value = valueBeforeInput;
    terminalStore.sendInput(event.data);
  }, true);
}

/** xterm is opened once into a host element that is moved in and out of the panel, so it survives remounts. */
export class TerminalView {
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private host: HTMLElement | null = null;

  attach(container: HTMLElement) {
    if (this.terminal) {
      container.appendChild(this.host);
    } else {
      this.createView(container);
    }

    this.fit();
    this.startSessionIfNeeded();
    this.terminal.focus();
  }

  detach() {
    this.host?.remove();
  }

  fit() {
    if (!this.fitAddon || !this.host?.isConnected) {
      return;
    }
    try {
      this.fitAddon.fit();
    } catch {}
  }

  private createView(container: HTMLElement) {
    const terminal = createTerminal();
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    this.host = document.createElement('div');
    this.host.className = 'terminal-host';
    container.appendChild(this.host);
    terminal.open(this.host);

    terminal.onData((data) => terminalStore.sendInput(data));
    sendTextXtermDrops(terminal);
    terminal.onResize(({ cols, rows }) => terminalStore.sendResize(cols, rows));

    terminalStore.onData((data) => terminal.write(data));
    terminalStore.onReconnect(() => terminal.reset());
    terminalStore.onConnected(() => {
      this.fit();
      terminalStore.sendResize(terminal.cols, terminal.rows);
      terminal.focus();
    });

    this.terminal = terminal;
    this.fitAddon = fitAddon;
    terminalStore.setTerminal(terminal);
  }

  /** Starts a session only if there is none; after a stop the tab waits for the user. */
  private startSessionIfNeeded() {
    if (terminalStore.sessionId
      || terminalStore.stopCode
      || terminalStore.connectionState !== TerminalConnectionState.Disconnected) {
      return;
    }

    terminalStore.connect();
  }
}

export const terminalView = new TerminalView();
