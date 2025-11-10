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

export interface FwUpdateProxyGetFirmwareInfoParams {
  slave_id: number;
  port: RpcTcpPortConfig | RpcSerialPortConfig;
  protocol?: 'modbus' | 'modbus-tcp';
}

export interface FwUpdateProxyGetFirmwareInfoResult {
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

export interface FwUpdateProxyUpdateParams {
  slave_id: number;
  port: RpcTcpPortConfig | RpcSerialPortConfig;
  protocol?: 'modbus' | 'modbus-tcp';
  type?: EmbeddedSoftwareType;
}

export interface FwUpdateProxyClearErrorParams {
  slave_id: number;
  port: string;
  type?: EmbeddedSoftwareType;
}

export interface FwUpdateProxyRestoreParams {
  slave_id: number;
  protocol?: 'modbus' | 'modbus-tcp';
  port: RpcTcpPortConfig | RpcSerialPortConfig;
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
  GetFirmwareInfo(params: FwUpdateProxyGetFirmwareInfoParams): Promise<FwUpdateProxyGetFirmwareInfoResult>;
  Update(params: FwUpdateProxyUpdateParams): Promise<void>;
  ClearError(params: FwUpdateProxyClearErrorParams): Promise<void>;
  Restore(params: FwUpdateProxyRestoreParams): Promise<void>;
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
  model: string;
}

export interface SerialDeviceProxy {
  LoadConfig(params: LoadConfigParams): Promise<LoadConfigResult>;
}

export interface DeviceTypeHardware {
  signature: string;
  fw?: string;
}

export interface DeviceTypeDescription {
  name: string;
  deprecated: boolean;
  type: string;
  protocol: string;
  'mqtt-id': string;
  'with-subdevices'?: boolean;
  hw?: DeviceTypeHardware[];
  schema?: Record<string, any>;
}

export interface DeviceTypeDescriptionGroup {
  name: string;
  types: DeviceTypeDescription[];
}

export interface DeviceTypeDropdownOption {
  label: string;
  value: string;
  hidden?: boolean;
}

export interface DeviceTypeDropdownOptionGroup {
  label: string;
  options: DeviceTypeDropdownOption[];
}

export interface SerialPortProxySetupItemNewConfig {
  slave_id?: number;
  baud_rate?: number;
  parity?: string;
  stop_bits?: number;
}

export interface SerialPortProxySetupItem {
  slave_id?: number;
  baud_rate: number;
  data_bits?: number;
  parity: string;
  stop_bits: number;
  sn?: number;
  cfg?: SerialPortProxySetupItemNewConfig;
}

export interface SerialPortProxySetupParams {
  path: string;
  items: SerialPortProxySetupItem[];
}

export interface SerialPortProxy {
  Setup(params: SerialPortProxySetupParams): Promise<void>;
}

export interface ScannedDevice {
  title: string;
  sn: string;
  address: number;
  type: string;
  port: string;
  baudRate: number;
  parity: string;
  stopBits: number;
  gotByFastScan: boolean;
  bootloaderMode: boolean;
}
