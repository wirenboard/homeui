export enum TerminalConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error',
}

export enum TerminalClientMessageType {
  Input = 'input',
  Resize = 'resize',
}

export enum TerminalServerMessageType {
  Output = 'output',
  Session = 'session',
  Notice = 'notice',
}

/**
 * After these the tab waits for the user. A close without a code (1005, 1006) leaves the session
 * alive, and the tab reconnects on its own.
 */
export enum TerminalCloseCode {
  SessionFinished = 1000,
  SlotTaken = 1013,
  TakenOver = 4001,
}

export enum TerminalNoticeKind {
  AptLock = 'apt-lock',
}

/** `session`: id of the session the notice is about; "Open here" connects to it. */
export interface TerminalNotice {
  kind: TerminalNoticeKind;
  session: string;
}

export interface TerminalBannerProps {
  variant: 'info' | 'warn' | 'gray';
  text: string;
  actionLabel: string;
  onAction: () => void;
}

export interface TerminalMessage {
  type: TerminalClientMessageType;
  data?: string;
  cols?: number;
  rows?: number;
}

export interface TerminalServerMessage {
  type: TerminalServerMessageType;
  /** `output`: base64-encoded bytes. */
  data?: string;
  id?: string;
  kind?: TerminalNoticeKind;
  session?: string;
}

export type PrivateKeys = 'ws' | 'onDataCallback' | 'onReconnectCallback' | 'onConnectedCallback'
  | 'handleOpen' | 'handleMessage' | 'handleError' | 'handleClose'
  | 'reconnectTimer' | 'reconnectAttempt' | 'intentionalDisconnect' | 'scheduleReconnect';

export const KEY_MAP: Record<string, { key: string; code: string; keyCode: number }> = {
  tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
  esc: { key: 'Escape', code: 'Escape', keyCode: 27 },
  up: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  left: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  home: { key: 'Home', code: 'Home', keyCode: 36 },
  end: { key: 'End', code: 'End', keyCode: 35 },
  pgup: { key: 'PageUp', code: 'PageUp', keyCode: 33 },
  pgdn: { key: 'PageDown', code: 'PageDown', keyCode: 34 },
  delete: { key: 'Delete', code: 'Delete', keyCode: 46 },
  backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
};
