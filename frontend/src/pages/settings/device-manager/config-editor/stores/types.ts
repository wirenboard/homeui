import type{ DeviceTypeDescriptionGroup } from '@/stores/device-manager/types';
import type { JsonSchema } from '@/stores/json-schema-editor';

export interface ConfiguredDevice {
  address: number;
  sn: string;
  deviceType: string;
  signatures: string[];
}

export interface SerialPort {
  baud_rate: number;
  data_bits: number;
  devices: any[];
  enabled: boolean;
  parity: string;
  path: string;
  port_type?: string;
  stop_bits: 2;
}

export interface TcpPort {
  address: string;
  connection_max_fail_cycles: number;
  connection_timeout_ms: number;
  devices: any[];
  enabled: boolean;
  guard_interval_us: number;
  port: number;
  port_type: string;
  response_timeout_ms: number;
}

export interface ModbusTcpPort {
  address: string;
  connected_to_mge: boolean;
  devices: any[];
  enabled: boolean;
  port: number;
  port_type: string;
}

export type PortConfig = SerialPort | TcpPort | ModbusTcpPort;

export interface ConfigJson {
  debug: boolean;
  ports: PortConfig[];
}

export interface LoadConfigResult {
  config: ConfigJson;
  schema: JsonSchema;
  deviceTypeGroups: DeviceTypeDescriptionGroup[];
}
