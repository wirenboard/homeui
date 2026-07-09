import { TerminalStore } from './terminal-store';
import { TerminalConnectionState } from './types';

let lastCreatedWs: MockWebSocket;

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  url: string;

  constructor(url: string) {
    this.url = url;
    lastCreatedWs = this;
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  simulateError() {
    this.onerror?.();
  }

  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }
}

vi.stubGlobal('WebSocket', MockWebSocket);

vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:8080' });

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

describe('TerminalStore', () => {
  let store: TerminalStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new TerminalStore();
  });

  describe('initial state', () => {
    test('starts disconnected', () => {
      expect(store.connectionState).toBe(TerminalConnectionState.Disconnected);
      expect(store.isConnected).toBe(false);
    });
  });

  describe('connect', () => {
    test('sets state to Connecting and creates WebSocket', () => {
      store.connect();
      expect(store.connectionState).toBe(TerminalConnectionState.Connecting);
      expect(lastCreatedWs.url).toBe('ws://localhost:8080/api/terminal');
    });

    test('sets state to Connected on WebSocket open', () => {
      store.connect();
      lastCreatedWs.simulateOpen();
      expect(store.connectionState).toBe(TerminalConnectionState.Connected);
      expect(store.isConnected).toBe(true);
    });

    test('sets state to Error on WebSocket error', () => {
      store.connect();
      lastCreatedWs.simulateError();
      expect(store.connectionState).toBe(TerminalConnectionState.Error);
    });

    test('sets state to Disconnected on WebSocket close', () => {
      store.connect();
      lastCreatedWs.simulateOpen();
      lastCreatedWs.simulateClose();
      expect(store.connectionState).toBe(TerminalConnectionState.Disconnected);
    });

    test('disconnects previous session before opening new one', () => {
      store.connect();
      const firstWs = lastCreatedWs;
      firstWs.simulateOpen();

      store.connect();
      expect(firstWs.close).toHaveBeenCalled();
      expect(store.connectionState).toBe(TerminalConnectionState.Connecting);
    });

    test('calls onReconnect callback when reconnecting', () => {
      const callback = vi.fn();
      store.onReconnect(callback);

      store.connect();
      expect(callback).not.toHaveBeenCalled();

      lastCreatedWs.simulateOpen();
      store.connect();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('calls onConnected callback when WebSocket opens', () => {
      const callback = vi.fn();
      store.onConnected(callback);

      store.connect();
      expect(callback).not.toHaveBeenCalled();

      lastCreatedWs.simulateOpen();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('calls onConnected on every reconnect', () => {
      const callback = vi.fn();
      store.onConnected(callback);

      store.connect();
      lastCreatedWs.simulateOpen();
      expect(callback).toHaveBeenCalledTimes(1);

      store.connect();
      lastCreatedWs.simulateOpen();
      expect(callback).toHaveBeenCalledTimes(2);
    });

    test('uses wss: protocol when page is served over https', () => {
      vi.stubGlobal('location', { protocol: 'https:', host: 'example.com' });
      store.connect();
      expect(lastCreatedWs.url).toBe('wss://example.com/api/terminal');
      vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:8080' });
    });
  });

  describe('disconnect', () => {
    test('closes WebSocket and resets state', () => {
      store.connect();
      const ws = lastCreatedWs;
      ws.simulateOpen();

      store.disconnect();
      expect(ws.close).toHaveBeenCalled();
      expect(store.connectionState).toBe(TerminalConnectionState.Disconnected);
      expect(store.isConnected).toBe(false);
    });

    test('nullifies onclose to prevent handler firing after manual disconnect', () => {
      store.connect();
      const ws = lastCreatedWs;
      ws.simulateOpen();

      store.disconnect();
      expect(ws.onclose).toBeNull();
    });

    test('is safe to call when already disconnected', () => {
      expect(() => store.disconnect()).not.toThrow();
      expect(store.connectionState).toBe(TerminalConnectionState.Disconnected);
    });
  });

  describe('onData', () => {
    test('calls registered callback with decoded output', () => {
      const callback = vi.fn();
      store.onData(callback);
      store.connect();
      lastCreatedWs.simulateOpen();

      const encoded = btoa('hello world');
      lastCreatedWs.simulateMessage(JSON.stringify({ type: 'output', data: encoded }));

      expect(callback).toHaveBeenCalledWith('hello world');
    });

    test('decodes UTF-8 output correctly', () => {
      const callback = vi.fn();
      store.onData(callback);
      store.connect();
      lastCreatedWs.simulateOpen();

      const encoded = utf8ToBase64('привет мир');
      lastCreatedWs.simulateMessage(JSON.stringify({ type: 'output', data: encoded }));

      expect(callback).toHaveBeenCalledWith('привет мир');
    });

    test('ignores non-output messages', () => {
      const callback = vi.fn();
      store.onData(callback);
      store.connect();
      lastCreatedWs.simulateOpen();

      lastCreatedWs.simulateMessage(JSON.stringify({ type: 'resize', cols: 80, rows: 24 }));
      expect(callback).not.toHaveBeenCalled();
    });

    test('ignores malformed JSON', () => {
      const callback = vi.fn();
      store.onData(callback);
      store.connect();
      lastCreatedWs.simulateOpen();

      lastCreatedWs.simulateMessage('not json');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('sendInput', () => {
    test('sends base64-encoded input over WebSocket', () => {
      store.connect();
      lastCreatedWs.simulateOpen();

      store.sendInput('ls\n');
      expect(lastCreatedWs.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'input', data: btoa('ls\n') }),
      );
    });

    test('encodes UTF-8 input correctly', () => {
      store.connect();
      lastCreatedWs.simulateOpen();

      store.sendInput('echo привет');
      const sent = JSON.parse(lastCreatedWs.send.mock.calls[0][0]);
      expect(sent.type).toBe('input');

      const binary = atob(sent.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      expect(new TextDecoder().decode(bytes)).toBe('echo привет');
    });

    test('does not send when WebSocket is not open', () => {
      store.connect();
      store.sendInput('ls\n');
      expect(lastCreatedWs.send).not.toHaveBeenCalled();
    });
  });

  describe('sendResize', () => {
    test('sends resize message over WebSocket', () => {
      store.connect();
      lastCreatedWs.simulateOpen();

      store.sendResize(120, 40);
      expect(lastCreatedWs.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'resize', cols: 120, rows: 40 }),
      );
    });

    test('does not send when WebSocket is not open', () => {
      store.connect();
      store.sendResize(80, 24);
      expect(lastCreatedWs.send).not.toHaveBeenCalled();
    });
  });

  describe('setTerminal', () => {
    test('stores terminal reference', () => {
      const fakeTerminal = { textarea: {}, focus: vi.fn() };
      store.setTerminal(fakeTerminal);
      expect(store.terminal).toBe(fakeTerminal);
    });

    test('clears terminal reference when set to null', () => {
      store.setTerminal({ textarea: {}, focus: vi.fn() });
      store.setTerminal(null);
      expect(store.terminal).toBeNull();
    });
  });

  describe('toggleCtrl / toggleAlt', () => {
    test('toggleCtrl toggles isCtrlActive', () => {
      expect(store.isCtrlActive).toBe(false);
      store.toggleCtrl();
      expect(store.isCtrlActive).toBe(true);
      store.toggleCtrl();
      expect(store.isCtrlActive).toBe(false);
    });

    test('toggleAlt toggles isAltActive', () => {
      expect(store.isAltActive).toBe(false);
      store.toggleAlt();
      expect(store.isAltActive).toBe(true);
      store.toggleAlt();
      expect(store.isAltActive).toBe(false);
    });
  });

  describe('resetModifiers', () => {
    test('resets both ctrl and alt to false', () => {
      store.toggleCtrl();
      store.toggleAlt();
      expect(store.isCtrlActive).toBe(true);
      expect(store.isAltActive).toBe(true);

      store.resetModifiers();
      expect(store.isCtrlActive).toBe(false);
      expect(store.isAltActive).toBe(false);
    });
  });

  describe('applyModifiers', () => {
    test('returns data unchanged when no modifiers active', () => {
      expect(store.applyModifiers('a')).toBe('a');
      expect(store.applyModifiers('hello')).toBe('hello');
    });

    test('converts letter to control code when ctrl is active', () => {
      store.toggleCtrl();
      expect(store.applyModifiers('c')).toBe('\x03');
      expect(store.isCtrlActive).toBe(false);
    });

    test('converts uppercase letter to control code when ctrl is active', () => {
      store.toggleCtrl();
      expect(store.applyModifiers('C')).toBe('\x03');
    });

    test('ctrl+a produces SOH (0x01)', () => {
      store.toggleCtrl();
      expect(store.applyModifiers('a')).toBe('\x01');
    });

    test('ctrl+z produces SUB (0x1a)', () => {
      store.toggleCtrl();
      expect(store.applyModifiers('z')).toBe('\x1a');
    });

    test('ctrl does not modify non-letter single chars', () => {
      store.toggleCtrl();
      expect(store.applyModifiers('1')).toBe('1');
      expect(store.isCtrlActive).toBe(false);
    });

    test('ctrl does not modify multi-char strings', () => {
      store.toggleCtrl();
      expect(store.applyModifiers('ab')).toBe('ab');
    });

    test('alt prepends ESC to data', () => {
      store.toggleAlt();
      expect(store.applyModifiers('x')).toBe('\x1bx');
      expect(store.isAltActive).toBe(false);
    });

    test('ctrl+alt produces control code prefixed with ESC', () => {
      store.toggleCtrl();
      store.toggleAlt();
      expect(store.applyModifiers('c')).toBe('\x1b\x03');
      expect(store.isCtrlActive).toBe(false);
      expect(store.isAltActive).toBe(false);
    });

    test('resets modifiers after applying', () => {
      store.toggleCtrl();
      store.toggleAlt();
      store.applyModifiers('a');
      expect(store.isCtrlActive).toBe(false);
      expect(store.isAltActive).toBe(false);
    });
  });

  describe('sendInput with modifiers', () => {
    test('sends ctrl+c as control code over WebSocket', () => {
      store.connect();
      lastCreatedWs.simulateOpen();

      store.toggleCtrl();
      store.sendInput('c');

      const sent = JSON.parse(lastCreatedWs.send.mock.calls[0][0]);
      expect(sent.type).toBe('input');

      const binary = atob(sent.data);
      expect(binary).toBe('\x03');
    });

    test('sends alt+x with ESC prefix over WebSocket', () => {
      store.connect();
      lastCreatedWs.simulateOpen();

      store.toggleAlt();
      store.sendInput('x');

      const sent = JSON.parse(lastCreatedWs.send.mock.calls[0][0]);
      const binary = atob(sent.data);
      expect(binary).toBe('\x1bx');
    });

    test('resets modifiers after sending', () => {
      store.connect();
      lastCreatedWs.simulateOpen();

      store.toggleCtrl();
      store.sendInput('c');

      expect(store.isCtrlActive).toBe(false);
    });
  });
});
