export interface Boot {
  hash: string;
  start: number;
  end?: number;
}

export interface LogsListFetch {
  boots: Boot[];
  services: string[];
}

export interface Cursor {
  id: string;
  direction: 'backward' | 'forward';
}

export enum LogLevel {
  Emergency,
  Alert,
  Critical,
  Error,
  Warning,
  Notice,
  Info,
  Debug,
}

export interface Log {
  time: number;
  level: LogLevel;
  msg: string;
  service: string;
  cursor?: string;
}
