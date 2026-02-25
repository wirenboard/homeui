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
  name: number;
}

export interface Device {
  id: string;
  name: string;
  groups: string[];
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
  id: string;
}

export interface GetBusParams {
  busId: string;
}

export interface GetDeviceParams {
  id: string;
}

export interface ScanBusParams {
  busId: string;
}

export interface DaliProxy {
  GetGateway(params: GetGatewayParams): Promise<GatewayDetailed>;
  GetBus(params: GetBusParams): Promise<BusDetailed>;
  GetDevice(params: GetDeviceParams): Promise<DeviceDetailed>;
  GetList(): Promise<Gateway[]>;
  ScanBus(params: ScanBusParams): Promise<Bus>;
}
