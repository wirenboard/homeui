import { Capability, Color, ColorModel, Property } from '@/stores/alice';

export interface Room {
  name: string;
  devices: string[];
}

export interface PropertyParameters {
  instance?: string;
  unit?: string;
  value?: string;
}

export interface SmartDeviceProperty {
  type: Property;
  mqtt: string;
  parameters: PropertyParameters;
}

export interface CapabilityParameters {
  color_model?: ColorModel;
  color_scene?: { scenes: string[] };
  instance?: string;
  modes?: string;
  unit?: string;
  range?: {
    min: number;
    max: number;
    precision: number;
  };
  temperature_k?: {
    min: number;
    max: number;
  };
}

export interface SmartDeviceCapability {
  type: Capability;
  mqtt: string;
  parameters: CapabilityParameters;
}

export interface SmartDevice {
  name: string;
  status_info: { reportable: boolean };
  description: string;
  room_id: string;
  type: string;
  properties: SmartDeviceProperty[];
  capabilities: SmartDeviceCapability[];
}

export interface AliceFetchData {
  rooms: Record<string, Room>;
  devices: Record<string, SmartDevice>;
  link_url?: string;
  unlink_url?: string;
}

export interface AddDeviceParams {
  name: string;
  room_id: string;
  type: string;
}

export interface AliceRoomUpdateParams {
  name?: string;
  devices?: string[];
}

export type AddRoomFetchData = Record<string, Room>;

export type AddDeviceFetchData = Record<string, SmartDevice>;

export interface SuccessMessageFetch {
  message: string;
}
