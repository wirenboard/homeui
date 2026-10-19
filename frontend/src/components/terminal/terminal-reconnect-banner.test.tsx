// @vitest-environment happy-dom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MockWebSocket } from '@/test/mocks/websocket';
import { TerminalReconnectBanner } from './terminal-banners';
import { terminalStore } from './terminal-store';
import { TerminalCloseCode } from './types';

const SESSION_ID = 'a'.repeat(32);
const BANNER_TEXT = 'terminal.reconnecting';

vi.stubGlobal('WebSocket', MockWebSocket);
vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:8080' });

function openSession() {
  terminalStore.connect();
  MockWebSocket.last.simulateOpen();
  MockWebSocket.last.simulateMessage({ type: 'session', id: SESSION_ID });
}

describe('TerminalReconnectBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    sessionStorage.clear();
    terminalStore.forgetSession();
    MockWebSocket.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('says nothing while the connection is up or is being opened for the first time', () => {
    render(<TerminalReconnectBanner />);

    act(() => terminalStore.connect());
    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();

    act(() => MockWebSocket.last.simulateOpen());
    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();
  });

  test('a connection that breaks on its own shows the banner until the automatic retry gets through', () => {
    openSession();
    render(<TerminalReconnectBanner />);

    act(() => MockWebSocket.last.simulateClose());
    expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument();

    act(() => vi.runOnlyPendingTimers());
    act(() => MockWebSocket.last.simulateOpen());
    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();
  });

  test('"reconnect now" goes back to the same session at once instead of waiting out the pause', () => {
    openSession();
    render(<TerminalReconnectBanner />);
    act(() => MockWebSocket.last.simulateClose());

    fireEvent.click(screen.getByText('terminal.buttons.reconnect-now'));

    expect(MockWebSocket.created).toBe(2);
    expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');
    expect(MockWebSocket.last.protocols).toEqual([SESSION_ID]);
    act(() => MockWebSocket.last.simulateOpen());
    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();
  });

  test('a session that ended has its own banner and no reconnecting one', () => {
    openSession();
    render(<TerminalReconnectBanner />);

    act(() => MockWebSocket.last.simulateClose(TerminalCloseCode.SessionFinished));

    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();
  });
});
