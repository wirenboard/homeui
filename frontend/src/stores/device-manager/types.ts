export interface RpcTcpPortConfig {
  address: string;
  port: number;
}

export interface RpcSerialPortConfig {
  path: string;
  baud_rate: number;
  data_bits: number;
  parity: string;
  stop_bits: number;
}

export type EmbeddedSoftwareType = 'firmware' | 'bootloader' | 'component';

export interface GetFirmwareInfoParams {
  slave_id: number;
  port: RpcTcpPortConfig | RpcSerialPortConfig;
  protocol?: 'modbus' | 'modbus-tcp';
}

export interface GetFirmwareInfoResult {
  fw: string;
  available_fw: string;
  bootloader: string;
  available_bootloader: string;
  can_update: boolean;
  fw_has_update: boolean;
  bootloader_has_update: boolean;
  model: string;
  components: Record<string, {
    model: string;
    fw: string;
    available_fw: string;
    has_update: boolean;
  }>;
}

export interface UpdateParams {
  slave_id: number;
  port: RpcTcpPortConfig | RpcSerialPortConfig;
  protocol?: 'modbus' | 'modbus-tcp';
  type?: EmbeddedSoftwareType;
}

export interface ClearErrorParams {
  slave_id: number;
  port: string;
  type?: EmbeddedSoftwareType;
}

export interface UpdateItem {
  port: string;
  type?: EmbeddedSoftwareType;
  slave_id: number;
  protocol: 'modbus' | 'modbus-tcp';
  progress: number;
  from_version: string;
  to_version: string;
  component_number?: number;
  component_model?: string;
  error?: {
    id:string;
    message: string;
  };
}

export interface UpdateStatus {
  devices: UpdateItem[];
}

export interface FwUpdateProxy {
  hasMethod(method: string): Promise<boolean>;
  GetFirmwareInfo(params: GetFirmwareInfoParams): Promise<GetFirmwareInfoResult>;
  Update(params: UpdateParams): Promise<void>;
  ClearError(params: ClearErrorParams): Promise<void>;
}

interface LoadConfigBaseParams {
  slave_id: number;
  device_type: string;
  modbus_mode: 'TCP' | 'RTU';
}

export type LoadConfigParams = LoadConfigBaseParams & (RpcTcpPortConfig | RpcSerialPortConfig);

export interface LoadConfigResult {
  parameters: Record<string, number>;
  fw: string;
}

export interface SerialDeviceProxy {
  LoadConfig(params: LoadConfigParams): Promise<LoadConfigResult>;
}
