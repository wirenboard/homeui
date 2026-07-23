export enum TerminalConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error',
}

export interface TerminalMessage {
  type: 'input' | 'resize' | 'output';
  data?: string;
  cols?: number;
  rows?: number;
}

export type PrivateKeys = 'ws' | 'onDataCallback' | 'onReconnectCallback' | 'onConnectedCallback'
  | 'handleOpen' | 'handleMessage' | 'handleError' | 'handleClose';

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
