export interface PortTabSerialConfig {
  path: string;
  baudRate: number;
  stopBits: number;
  parity: string;
  dataBits: number;
}

export interface PortTabTcpConfig {
  address: string;
  port: number;
  modbusTcp: boolean;
}

export type PortTabConfig = PortTabSerialConfig | PortTabTcpConfig;
