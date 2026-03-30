import {
  type JsonSchema,
} from '@/stores/json-schema-editor';

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

export interface ScanBusParams {
  busId: string;
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
  SetGroup(params: { groupId: string; config: object }): Promise<GroupDetailed>;
  GetList(): Promise<Gateway[]>;
  ScanBus(params: ScanBusParams): Promise<Bus>;
}
