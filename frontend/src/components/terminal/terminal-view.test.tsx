// @vitest-environment happy-dom
import { act, render } from '@testing-library/react';
import { MockWebSocket } from '@/test/mocks/websocket';
import { terminalStore } from './terminal-store';
import { TerminalContent } from './terminal-tab';
import { TerminalCloseCode, TerminalConnectionState } from './types';

const SESSION_ID = 'a'.repeat(32);

vi.stubGlobal('WebSocket', MockWebSocket);
vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:8080' });

/** Opens the panel, lets the server name the session and closes the panel again. */
function openAndClosePanel() {
  const panel = render(<TerminalContent />);
  act(() => {
    MockWebSocket.last.simulateOpen();
    MockWebSocket.last.simulateMessage({ type: 'session', id: SESSION_ID });
  });
  panel.unmount();
  return panel;
}

describe('terminal outliving the console panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    terminalStore.forgetSession();
    MockWebSocket.reset();
  });

  test('opening the console panel starts a session', () => {
    render(<TerminalContent />);

    expect(MockWebSocket.created).toBe(1);
    expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');
  });

  test('collapsing the panel keeps the connection: a running command is not interrupted', () => {
    openAndClosePanel();

    expect(MockWebSocket.last.close).not.toHaveBeenCalled();
    expect(terminalStore.connectionState).toBe(TerminalConnectionState.Connected);
    expect(terminalStore.sessionId).toBe(SESSION_ID);
  });

  test('opening the panel again reuses the same connection and the same terminal', () => {
    openAndClosePanel();
    const wsWhileHidden = MockWebSocket.last;
    const terminalWhileHidden = terminalStore.terminal;
    expect(terminalWhileHidden).not.toBeNull();

    const { container } = render(<TerminalContent />);

    expect(MockWebSocket.created).toBe(1);
    expect(MockWebSocket.last).toBe(wsWhileHidden);
    expect(terminalStore.terminal).toBe(terminalWhileHidden);
    expect(container.querySelector('.terminal-container .terminal-host')).not.toBeNull();
  });

  test('the terminal is taken out of the page while the panel is closed and put back on reopening', () => {
    const first = render(<TerminalContent />);
    const host = first.container.querySelector('.terminal-host');
    expect(host).not.toBeNull();

    first.unmount();
    expect(host.isConnected).toBe(false);

    const second = render(<TerminalContent />);
    expect(second.container.querySelector('.terminal-host')).toBe(host);
  });

  test('a session ended while the panel was closed is not restarted behind the banner', () => {
    openAndClosePanel();
    MockWebSocket.last.simulateClose(TerminalCloseCode.SessionFinished);

    render(<TerminalContent />);

    expect(MockWebSocket.created).toBe(1);
    expect(terminalStore.sessionId).toBeNull();
  });

  test('reconnecting after a takeover clears the screen the server is about to replay onto', () => {
    render(<TerminalContent />);
    act(() => {
      MockWebSocket.last.simulateOpen();
      MockWebSocket.last.simulateMessage({ type: 'session', id: SESSION_ID });
      MockWebSocket.last.simulateClose(TerminalCloseCode.TakenOver);
    });
    const reset = vi.spyOn(terminalStore.terminal, 'reset');

    // "Reconnect" on the banner
    act(() => {
      terminalStore.connect();
    });

    expect(reset).toHaveBeenCalledTimes(1);
    expect(MockWebSocket.created).toBe(2);
    reset.mockRestore();
  });

  test('after a homeui logout the panel opens a session of its own', () => {
    openAndClosePanel();
    terminalStore.forgetSession();

    render(<TerminalContent />);

    expect(MockWebSocket.created).toBe(2);
    expect(MockWebSocket.last.protocols).toBeUndefined();
  });

  test('after a page reload the console reattaches to the session whose id the tab kept', async () => {
    sessionStorage.setItem('terminal-session', SESSION_ID);
    // Simulates a reload: a fresh store and view, with the id already in sessionStorage
    vi.resetModules();
    const { terminalView: reloadedView } = await import('./terminal-view');

    reloadedView.attach(document.createElement('div'));

    expect(MockWebSocket.created).toBe(1);
    expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');
    expect(MockWebSocket.last.protocols).toEqual([SESSION_ID]);
  });

  // Kept last: it leaves the shared terminal resized.
  test('the size of the panel reaches the server on connecting and on every layout change after it', () => {
    render(<TerminalContent />);
    MockWebSocket.last.simulateOpen();
    const { cols, rows } = terminalStore.terminal;
    expect(cols).toBeGreaterThan(0);

    expect(MockWebSocket.last.send).toHaveBeenCalledWith(JSON.stringify({ type: 'resize', cols, rows }));

    // The panel is resized and xterm recalculates the grid
    terminalStore.terminal.resize(100, 30);

    expect(MockWebSocket.last.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'resize', cols: 100, rows: 30 }),
    );
  });
});
