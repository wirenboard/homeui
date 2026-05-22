export interface FullScannedDevice {
  uuid: string;
  port: {
    path: string;
  };
  cfg: {
    slave_id: number;
    baud_rate: number;
    parity: string;
    data_bits: number;
    stop_bits: number;
  };
  title: string;
  sn: string;
  device_signature: string;
  fw_signature: string;
  configured_device_type: string;
  last_seen: number;
  bootloader_mode: boolean;
  errors: [];
  fw: {
    version: string;
    ext_support: boolean;
    fast_modbus_command: number;
    update?: {
      error: string;
    };
  };
}

export interface GlobalError {
  id: string;
  message: string;
  metadata: {
    failed_ports: string[];
  };
}
