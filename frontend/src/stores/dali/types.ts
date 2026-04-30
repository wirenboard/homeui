import {
  type JsonSchema,
} from '@/stores/json-schema-editor';

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
  config: object;
  schema: JsonSchema;
}

export interface BusDetailed {
  config: object;
  schema: JsonSchema;
}

export interface DeviceDetailed {
  config: object;
  schema: JsonSchema;
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
  id: string;
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
}
