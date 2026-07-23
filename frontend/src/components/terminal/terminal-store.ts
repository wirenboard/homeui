import { action, makeAutoObservable } from 'mobx';
import { type PrivateKeys, TerminalConnectionState, type TerminalMessage } from './types';

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

export class TerminalStore {
  connectionState = TerminalConnectionState.Disconnected;
  terminal: any = null;
  isCtrlActive = false;
  isAltActive = false;
  private ws: WebSocket | null = null;
  private onDataCallback: ((data: string) => void) | null = null;
  private onReconnectCallback: (() => void) | null = null;
  private onConnectedCallback: (() => void) | null = null;

  constructor() {
    makeAutoObservable<this, PrivateKeys>(this, {
      ws: false,
      onDataCallback: false,
      onReconnectCallback: false,
      onConnectedCallback: false,
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
    const isReconnect = this.ws !== null;
    this.disconnect();

    if (isReconnect) {
      this.onReconnectCallback?.();
    }

    this.connectionState = TerminalConnectionState.Connecting;

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/api/terminal`;

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.handleOpen();
    };

    ws.onmessage = (event) => {
      this.handleMessage(event);
    };

    ws.onerror = () => {
      this.handleError();
    };

    ws.onclose = () => {
      this.handleClose();
    };
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
      const msg: TerminalMessage = { type: 'input', data: encodeBase64(processed) };
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendResize(cols: number, rows: number) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: TerminalMessage = { type: 'resize', cols, rows };
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
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connectionState = TerminalConnectionState.Disconnected;
  }

  private handleOpen() {
    this.connectionState = TerminalConnectionState.Connected;
    this.onConnectedCallback?.();
  }

  private handleMessage(event: MessageEvent) {
    try {
      const msg: TerminalMessage = JSON.parse(event.data);
      if (msg.type === 'output' && msg.data && this.onDataCallback) {
        this.onDataCallback(decodeBase64(msg.data));
      }
    } catch {}
  }

  private handleError() {
    this.connectionState = TerminalConnectionState.Error;
  }

  private handleClose() {
    this.ws = null;
    this.connectionState = TerminalConnectionState.Disconnected;
  }
}

export const terminalStore = new TerminalStore();
