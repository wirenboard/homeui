// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { MockWebSocket } from '@/test/mocks/websocket';
import { TerminalNoticePanel, TerminalStopBanner } from './terminal-banners';
import { terminalStore } from './terminal-store';
import { TerminalCloseCode } from './types';

const SESSION_ID = 'a'.repeat(32);
const OTHER_SESSION_ID = 'b'.repeat(32);

vi.stubGlobal('WebSocket', MockWebSocket);
vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:8080' });

/** Connects, lets the server assign a session id and plays the given server messages. */
function openSession(...messages: object[]) {
  terminalStore.connect();
  MockWebSocket.last.simulateOpen();
  MockWebSocket.last.simulateMessage({ type: 'session', id: SESSION_ID });
  messages.forEach((message) => MockWebSocket.last.simulateMessage(message));
}

describe('terminal banners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    terminalStore.forgetSession();
    MockWebSocket.reset();
  });

  describe('TerminalNoticePanel', () => {
    test('shows what is running in another session and offers to open it here', () => {
      const onData = vi.fn();
      terminalStore.onData(onData);
      openSession({ type: 'notice', kind: 'apt-lock', session: OTHER_SESSION_ID });

      render(<TerminalNoticePanel />);

      expect(screen.getByText('terminal.notice.apt-lock')).toBeInTheDocument();
      expect(onData).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'terminal.buttons.open-here' }));

      expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');

      expect(MockWebSocket.last.protocols).toEqual([OTHER_SESSION_ID]);
    });

    test('nothing is rendered while no notice has arrived', () => {
      openSession();
      const { container } = render(<TerminalNoticePanel />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('TerminalStopBanner', () => {
    test('a session taken over by another window is reported and can be brought back', () => {
      const onData = vi.fn();
      terminalStore.onData(onData);
      openSession();
      MockWebSocket.last.simulateClose(TerminalCloseCode.TakenOver);

      render(<TerminalStopBanner />);

      expect(screen.getByText('terminal.stopped.taken-over')).toBeInTheDocument();
      expect(onData).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'terminal.buttons.reconnect' }));

      expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');

      expect(MockWebSocket.last.protocols).toEqual([SESSION_ID]);
    });

    test('a finished session offers a new one, not a reconnect', () => {
      openSession();
      MockWebSocket.last.simulateClose(TerminalCloseCode.SessionFinished);

      render(<TerminalStopBanner />);

      expect(screen.getByText('terminal.stopped.session-finished')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'terminal.buttons.new-session' }));

      expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');
      expect(MockWebSocket.last.protocols).toBeUndefined();
    });

    test('nothing is rendered while the connection is live', () => {
      openSession();
      const { container } = render(<TerminalStopBanner />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
