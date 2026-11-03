import { action, makeAutoObservable } from 'mobx';
import {
  type PrivateKeys,
  TerminalClientMessageType,
  TerminalCloseCode,
  TerminalConnectionState,
  type TerminalMessage,
  type TerminalNotice,
  type TerminalServerMessage,
  TerminalServerMessageType,
} from './types';

function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;

const SESSION_STORAGE_KEY = 'terminal-session';

function readStoredSession(): string | null {
  return sessionStorage.getItem(SESSION_STORAGE_KEY);
}

function writeStoredSession(id: string | null) {
  if (id) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  } else {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export class TerminalStore {
  connectionState = TerminalConnectionState.Disconnected;
  terminal: any = null;
  isCtrlActive = false;
  isAltActive = false;
  sessionId: string | null = null;
  notice: TerminalNotice | null = null;
  stopCode: TerminalCloseCode | null = null;
  /** Waiting to reconnect after an unexpected drop; input is lost meanwhile. */
  isReconnecting = false;
  private ws: WebSocket | null = null;
  private onDataCallback: ((data: string) => void) | null = null;
  private onReconnectCallback: (() => void) | null = null;
  private onConnectedCallback: (() => void) | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private intentionalDisconnect = false;

  constructor() {
    makeAutoObservable<this, PrivateKeys>(this, {
      ws: false,
      onDataCallback: false,
      onReconnectCallback: false,
      onConnectedCallback: false,
      reconnectTimer: false,
      reconnectAttempt: false,
      intentionalDisconnect: false,
      scheduleReconnect: false,
      terminal: false,
      handleOpen: action.bound,
      handleMessage: action.bound,
      handleError: action.bound,
      handleClose: action.bound,
    }, { autoBind: true });
  }

  get isConnected() {
    return this.connectionState === TerminalConnectionState.Connected;
  }

  onData(cb: (data: string) => void) {
    this.onDataCallback = cb;
  }

  onReconnect(cb: () => void) {
    this.onReconnectCallback = cb;
  }

  onConnected(cb: () => void) {
    this.onConnectedCallback = cb;
  }

  connect() {
    this.intentionalDisconnect = false;
    this.reconnectAttempt = 0;
    this.clearReconnectTimer();
    this.closeWebSocket();

    // The server replays its buffer on every connection, so start from a clean screen.
    this.onReconnectCallback?.();

    this.stopCode = null;
    this.notice = null;
    this.isReconnecting = false;
    this.sessionId = readStoredSession();
    this.connectionState = TerminalConnectionState.Connecting;
    this.openWebSocket();
  }

  openNoticeSession() {
    const id = this.notice?.session;
    if (!id) {
      return;
    }
    this.setSessionId(id);
    this.connect();
  }

  /** On homeui logout; the session itself keeps running on the server. */
  forgetSession() {
    this.disconnect();
    this.setSessionId(null);
    this.stopCode = null;
    this.notice = null;
  }

  applyModifiers(data: string): string {
    if (!this.isCtrlActive && !this.isAltActive) {
      return data;
    }

    let result = data;

    if (this.isCtrlActive && data.length === 1) {
      const code = data.toLowerCase().charCodeAt(0);
      if (code >= 97 && code <= 122) {
        result = String.fromCharCode(code - 96);
      }
    }

    if (this.isAltActive) {
      result = '\x1b' + result;
    }

    this.isCtrlActive = false;
    this.isAltActive = false;

    return result;
  }

  sendInput(data: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const processed = this.applyModifiers(data);
      const msg: TerminalMessage = { type: TerminalClientMessageType.Input, data: encodeBase64(processed) };
      this.ws.send(JSON.stringify(msg));
    }
  }

  /** A 0x0 size (panel not laid out yet) kills `login` in a new session, so it is not sent. */
  sendResize(cols: number, rows: number) {
    if (cols > 0 && rows > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg: TerminalMessage = { type: TerminalClientMessageType.Resize, cols, rows };
      this.ws.send(JSON.stringify(msg));
    }
  }

  setTerminal(terminal: any) {
    this.terminal = terminal;
  }

  toggleCtrl() {
    this.isCtrlActive = !this.isCtrlActive;
  }

  toggleAlt() {
    this.isAltActive = !this.isAltActive;
  }

  resetModifiers() {
    this.isCtrlActive = false;
    this.isAltActive = false;
  }

  disconnect() {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.closeWebSocket();
    this.connectionState = TerminalConnectionState.Disconnected;
    this.isReconnecting = false;
  }

  private openWebSocket() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    // The id is sent as a subprotocol, not in the URL, to keep it out of the access log.
    const ws = new WebSocket(`${proto}//${location.host}/api/terminal`, this.sessionId ? [this.sessionId] : undefined);
    this.ws = ws;

    ws.onopen = () => this.handleOpen();
    ws.onmessage = (event) => this.handleMessage(event);
    ws.onerror = () => this.handleError();
    ws.onclose = (event) => this.handleClose(event);
  }

  private closeWebSocket() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.intentionalDisconnect) {
      return;
    }
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempt),
      RECONNECT_MAX_DELAY,
    );
    this.reconnectAttempt++;
    this.isReconnecting = true;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.intentionalDisconnect) {
        return;
      }
      this.connectionState = TerminalConnectionState.Connecting;
      this.onReconnectCallback?.();
      this.openWebSocket();
    }, delay);
  }

  private handleOpen() {
    this.reconnectAttempt = 0;
    this.connectionState = TerminalConnectionState.Connected;
    this.isReconnecting = false;
    this.onConnectedCallback?.();
  }

  private handleMessage(event: MessageEvent) {
    try {
      this.applyServerMessage(JSON.parse(event.data) as TerminalServerMessage);
    } catch {}
  }

  private applyServerMessage(msg: TerminalServerMessage) {
    switch (msg.type) {
      case TerminalServerMessageType.Output:
        if (msg.data && this.onDataCallback) {
          this.onDataCallback(decodeBase64(msg.data));
        }
        break;
      case TerminalServerMessageType.Session:
        if (msg.id) {
          this.setSessionId(msg.id);
        }
        break;
      case TerminalServerMessageType.Notice:
        this.notice = { kind: msg.kind, session: msg.session };
        break;
      default:
        break;
    }
  }

  private handleError() {
    this.connectionState = TerminalConnectionState.Error;
  }

  private handleClose(event: CloseEvent) {
    this.ws = null;
    this.connectionState = TerminalConnectionState.Disconnected;

    if (this.intentionalDisconnect) {
      return;
    }

    if (Object.values(TerminalCloseCode).includes(event.code)) {
      this.stopSession(event.code);
      return;
    }

    this.scheduleReconnect();
  }

  private stopSession(code: TerminalCloseCode) {
    this.stopCode = code;
    this.isReconnecting = false;

    // A session taken over by another window is still alive; keep its id for "Reconnect".
    if (code !== TerminalCloseCode.TakenOver) {
      this.setSessionId(null);
    }
  }

  /** Also kept in `sessionStorage` so a page reload reattaches to the same session. */
  private setSessionId(id: string | null) {
    this.sessionId = id;
    writeStoredSession(id);
  }
}

export const terminalStore = new TerminalStore();
