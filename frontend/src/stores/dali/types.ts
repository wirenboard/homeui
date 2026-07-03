import {
  type JsonSchema,
} from '@/stores/json-schema-editor';
import type { MonitorStore } from './monitor-store';

export type CommissioningStatus =
  | 'idle'
  | 'queued'
  | 'query_short_addresses'
  | 'binary_search'
  | 'dali2_query_short_addresses'
  | 'dali2_binary_search'
  | 'read_device_info'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface CommissioningDeviceSummary {
  id: string;
  name: string;
  groups: number[];
}

export interface CommissioningState {
  status: CommissioningStatus;
  progress: number;
  error: string | null;
  device_count: number;
  devices: CommissioningDeviceSummary[] | null;
  finished_at: string | null;
}

export interface Gateway {
  id: string;
  name: string;
  buses: Bus[];
}

export interface Bus {
  id: string;
  name: string;
  devices: Device[];
  groups: Group[];
  commissioning?: CommissioningState;
  bus_monitor_enabled?: boolean;
}

export interface Group {
  id: string;
  index: number;
}

export interface Device {
  id: string;
  name: string;
  groups: number[];
}

export interface GatewayDetailed {
  config: {
    websocket_port?: number;
    websocket_enabled?: boolean;
  };
  schema: JsonSchema;
  name: string;
}

export interface BusDetailed {
  config: object;
  schema: JsonSchema;
  name: string;
}

export interface DeviceDetailed {
  config: object;
  schema: JsonSchema;
  name: string;
  groups: boolean[];
}

export interface GetGatewayParams {
  gatewayId: string;
}

export interface SetGatewayParams {
  gatewayId: string;
  config: object;
}

export interface GetBusParams {
  busId: string;
}

export interface SetBusParams {
  busId: string;
  config: object;
}

export interface GetDeviceParams {
  deviceId: string;
  forceReload?: boolean;
}

export interface SetDeviceParams {
  deviceId: string;
  config: object;
}

export interface GetGroupParams {
  groupId: string;
}

export interface SetGroupParams {
  groupId: string;
  config: object;
}

export interface ScanBusParams {
  busId: string;
}

export interface StopScanBusParams {
  busId: string;
}

export interface ScanBusResponse {
  status: 'started' | 'already_running';
  progressTopic: string;
}

export interface StopScanBusResponse {
  status: 'stopped' | 'not_running';
}

export interface GroupDetailed {
  config: object;
  schema: JsonSchema;
}

export interface DaliProxy {
  GetGateway(params: GetGatewayParams): Promise<GatewayDetailed>;
  SetGateway(params: SetGatewayParams): Promise<void>;
  GetBus(params: GetBusParams): Promise<BusDetailed>;
  SetBus(params: SetBusParams): Promise<void>;
  GetDevice(params: GetDeviceParams): Promise<DeviceDetailed>;
  SetDevice(params: SetDeviceParams): Promise<DeviceDetailed>;
  GetGroup(params: GetGroupParams): Promise<GroupDetailed>;
  SetGroup(params: SetGroupParams): Promise<GroupDetailed>;
  GetList(): Promise<Gateway[]>;
  ScanBus(params: ScanBusParams): Promise<ScanBusResponse>;
  StopScanBus(params: StopScanBusParams): Promise<StopScanBusResponse>;
  IdentifyDevice(params: { deviceId: string }): Promise<void>;
  ResetDeviceSettings(params: { deviceId: string }): Promise<void>;
  ResetDevice(params: { deviceId: string }): Promise<void>;
}

export interface SendCommandParams {
  busId: string;
  commands: string[];
}

export interface SendCommandResponseValue {
  raw: number;
  value: string;
}

export interface SendCommandResultItem {
  status: 'ok' | 'error';
  response?: SendCommandResponseValue;
  error?: string;
}

export interface ListCommandsEntry {
  name: string;
  category: string;
  snippet: string;
}

export interface DaliBusProxy {
  SendCommand(params: SendCommandParams): Promise<SendCommandResultItem[]>;
  ListCommands(params: Record<string, never>): Promise<ListCommandsEntry[]>;
}

// --- Bus monitor: parsed line ---

export type BusMonitorDirection = 'out' | 'in';
export type BusMonitorResponseKind = 'none' | 'value' | 'error';

/** Frame type taken from the raw packet length: 2-byte (FF16) vs 3-byte (FF24). */
export type FrameType = 'FF16' | 'FF24';

export interface BusMonitorResponse {
  kind: BusMonitorResponseKind;
  /** Full response text, verbatim. */
  text: string;
  /** For kind 'value': the backward-packet hex (e.g. '00fe'). */
  hex?: string;
  /** For kind 'value': the decoded value (e.g. '254'). */
  value?: string;
}

export interface BusMonitorBadges {
  /** Hardware monitor packet counter — present only on unexpected ('in') packets. */
  fc?: number;
  /** Command originated from the Lunatone Cockpit emulator. */
  fromLunatone?: boolean;
}

export interface ParsedBusMonitorLine {
  raw: string;
  /** 'HH:MM:SS.mmm', or '' when absent (e.g. the syslog variant). */
  time: string;
  /** '>>' → 'out' (our request), '<<' → 'in' (unexpected packet from the bus). */
  direction: BusMonitorDirection | null;
  /** Raw hex of the request/packet. */
  hex: string;
  /** Decoded command expression (Bus/SendCommand syntax) or FF{len}/BF{len} — verbatim. */
  command: string;
  response: BusMonitorResponse;
  badges: BusMonitorBadges;
}

// --- Bus monitor: store registry + console tab ---

export interface MonitorRecord {
  monitorStore: MonitorStore;
  gatewayName: string;
  busIndex: number;
  shownOnce: boolean;
}

export interface EnableOptions {
  gatewayName: string;
  busIndex: number;
  autoShow: boolean;
}
