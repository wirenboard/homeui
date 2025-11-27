import {
  JsonSchema
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
