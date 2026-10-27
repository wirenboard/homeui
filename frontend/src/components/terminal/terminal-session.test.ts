import { MockWebSocket } from '@/test/mocks/websocket';
import { TerminalStore } from './terminal-store';
import { TerminalCloseCode } from './types';

const SESSION_ID = 'a'.repeat(32);
const OTHER_SESSION_ID = 'b'.repeat(32);
const STORAGE_KEY = 'terminal-session';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  writable: true,
});

vi.stubGlobal('WebSocket', MockWebSocket);
vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:8080' });

function storeSession(id: string) {
  storage.set(STORAGE_KEY, id);
}

function storedSession() {
  return storage.get(STORAGE_KEY) ?? null;
}

describe('TerminalStore sessions', () => {
  let store: TerminalStore;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    storage.clear();
    MockWebSocket.reset();
    store = new TerminalStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('reconnecting by close code', () => {
    test.each([
      { code: TerminalCloseCode.SessionFinished },
      { code: TerminalCloseCode.SlotTaken },
      { code: TerminalCloseCode.TakenOver },
    ])('close code $code stops the tab and opens no new connection', ({ code }) => {
      store.connect();
      MockWebSocket.last.simulateOpen();
      expect(MockWebSocket.created).toBe(1);

      MockWebSocket.last.simulateClose(code);
      vi.advanceTimersByTime(60000);

      expect(store.stopCode).toBe(code);
      expect(MockWebSocket.created).toBe(1);
    });

    test('an abnormal close (1006) reconnects on its own to the same session: it outlives the connection', () => {
      storeSession(SESSION_ID);
      store.connect();
      MockWebSocket.last.simulateOpen();

      MockWebSocket.last.simulateClose(1006);
      expect(store.stopCode).toBeNull();

      vi.advanceTimersByTime(1000);

      expect(MockWebSocket.created).toBe(2);
      expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');
      expect(MockWebSocket.last.protocols).toEqual([SESSION_ID]);
    });

    test('a session ended by the server is forgotten, a session taken over by another window is kept', () => {
      storeSession(SESSION_ID);
      store.connect();
      MockWebSocket.last.simulateOpen();
      MockWebSocket.last.simulateClose(TerminalCloseCode.TakenOver);
      expect(store.sessionId).toBe(SESSION_ID);
      expect(storedSession()).toBe(SESSION_ID);

      store.connect();
      expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');
      expect(MockWebSocket.last.protocols).toEqual([SESSION_ID]);

      MockWebSocket.last.simulateOpen();
      MockWebSocket.last.simulateClose(TerminalCloseCode.SessionFinished);
      expect(store.sessionId).toBeNull();
      expect(storedSession()).toBeNull();

      store.connect();
      expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');
      expect(MockWebSocket.last.protocols).toBeUndefined();
    });
  });

  describe('session id in the subprotocol', () => {
    test('a tab without a session id asks for a new session: no subprotocol, nothing in the URL', () => {
      store.connect();
      expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');
      expect(MockWebSocket.last.protocols).toBeUndefined();
    });

    test('sends the id kept in sessionStorage as the only subprotocol, never in the URL', () => {
      storeSession(SESSION_ID);
      store.connect();
      expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');
      expect(MockWebSocket.last.protocols).toEqual([SESSION_ID]);
      expect(store.sessionId).toBe(SESSION_ID);
    });

    test('remembers the id the server sends and reuses it on the next connection', () => {
      store.connect();
      MockWebSocket.last.simulateOpen();
      MockWebSocket.last.simulateMessage({ type: 'session', id: SESSION_ID });

      expect(store.sessionId).toBe(SESSION_ID);
      expect(storedSession()).toBe(SESSION_ID);

      store.connect();
      expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');
      expect(MockWebSocket.last.protocols).toEqual([SESSION_ID]);
    });
  });

  describe('messages that are interface, not output', () => {
    test('notice is kept as a notice and nothing of it goes into the terminal output', () => {
      const onData = vi.fn();
      store.onData(onData);
      store.connect();
      MockWebSocket.last.simulateOpen();

      MockWebSocket.last.simulateMessage({ type: 'notice', kind: 'apt-lock', session: OTHER_SESSION_ID });

      expect(store.notice).toEqual({ kind: 'apt-lock', session: OTHER_SESSION_ID });
      expect(onData).not.toHaveBeenCalled();
    });
  });

  describe('telling the server the window size', () => {
    test('a size the panel does not have yet is kept back: a 0x0 window kills login in the session', () => {
      store.connect();
      MockWebSocket.last.simulateOpen();

      // What a collapsed panel reports
      store.sendResize(0, 0);
      store.sendResize(80, 0);

      expect(MockWebSocket.last.send).not.toHaveBeenCalled();
    });

    test('the first real size the panel gets goes out', () => {
      store.connect();
      MockWebSocket.last.simulateOpen();
      store.sendResize(0, 0);

      store.sendResize(80, 24);

      expect(MockWebSocket.last.send).toHaveBeenCalledTimes(1);
      expect(MockWebSocket.last.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'resize', cols: 80, rows: 24 }),
      );
    });
  });

  describe('explicit actions', () => {
    test('"Open here" attaches the tab to the session named in the notice', () => {
      store.connect();
      MockWebSocket.last.simulateOpen();
      MockWebSocket.last.simulateMessage({ type: 'session', id: SESSION_ID });
      MockWebSocket.last.simulateMessage({ type: 'notice', kind: 'apt-lock', session: OTHER_SESSION_ID });

      store.openNoticeSession();

      expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');

      expect(MockWebSocket.last.protocols).toEqual([OTHER_SESSION_ID]);
      expect(store.notice).toBeNull();
    });

    test('"Reconnect" after a takeover resets the screen: the replayed buffer lands on a clean one', () => {
      const resetScreen = vi.fn();
      store.onReconnect(resetScreen);
      storeSession(SESSION_ID);

      store.connect();
      expect(resetScreen).toHaveBeenCalledTimes(1);
      MockWebSocket.last.simulateOpen();
      MockWebSocket.last.simulateClose(TerminalCloseCode.TakenOver);

      // "Reconnect" on the banner
      store.connect();

      expect(resetScreen).toHaveBeenCalledTimes(2);
      expect(MockWebSocket.last.url).toBe('ws://localhost:8080/api/terminal');
      expect(MockWebSocket.last.protocols).toEqual([SESSION_ID]);
    });

    test('homeui logout closes the connection, forgets the id and does not reconnect', () => {
      storeSession(SESSION_ID);
      store.connect();
      const ws = MockWebSocket.last;
      ws.simulateOpen();

      store.forgetSession();

      expect(ws.close).toHaveBeenCalled();
      expect(store.sessionId).toBeNull();
      expect(storedSession()).toBeNull();

      vi.advanceTimersByTime(60000);
      expect(MockWebSocket.created).toBe(1);
    });
  });
});
