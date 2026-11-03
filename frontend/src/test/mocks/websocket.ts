import type { Mock } from 'vitest';

/**
 * WebSocket stub driven by the test: `simulate*` methods act as the server, `send` and `close`
 * record what the code under test did. Install with `vi.stubGlobal('WebSocket', MockWebSocket)`
 * and call `MockWebSocket.reset()` between tests.
 */
export class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;

  /** Sockets created since the last `reset()`, oldest first. */
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  send: Mock = vi.fn();
  close: Mock = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });
  url: string;
  /** The session id, or undefined for a new session. */
  protocols: string | string[] | undefined;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    MockWebSocket.instances.push(this);
  }

  static get last(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }

  static get created(): number {
    return MockWebSocket.instances.length;
  }

  static reset() {
    MockWebSocket.instances = [];
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  /** Without a code, simulates a dropped connection (1006). */
  simulateClose(code = 1006) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code });
  }

  /** Browsers follow an error with a close; tests simulate that separately. */
  simulateError() {
    this.onerror?.();
  }

  simulateMessage(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}
