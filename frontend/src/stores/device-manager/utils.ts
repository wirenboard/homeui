import type { PortTabSerialConfig, PortTabTcpConfig, PortTabConfig } from './port-tab/types';
import type {
  RpcTcpPortConfig,
  RpcSerialPortConfig,
  SerialPortProxy,
  SerialPortProxySetupParams,
  SerialPortProxySetupItem,
  SerialPortProxySetupItemNewConfig,
  ScannedDevice
} from './types';

export function toRpcPortConfig(portConfig: PortTabConfig): RpcTcpPortConfig | RpcSerialPortConfig {
  if (Object.hasOwn(portConfig, 'address')) {
    const res: RpcTcpPortConfig = {
      address: (portConfig as PortTabTcpConfig).address,
      port: (portConfig as PortTabTcpConfig).port,
    };
    return res;
  }
  const res: RpcSerialPortConfig = {
    path: (portConfig as PortTabSerialConfig).path,
    baud_rate: (portConfig as PortTabSerialConfig).baudRate,
    parity: (portConfig as PortTabSerialConfig).parity,
    stop_bits: (portConfig as PortTabSerialConfig).stopBits,
    data_bits: (portConfig as PortTabSerialConfig).dataBits,
  };
  return res;
}

export function getIntAddress(address: string | number): number {
  return Number.isInteger(address) ? address as number : parseInt(address as string);
}

export const setupDevice = async (
  serialPortProxy: SerialPortProxy,
  device: ScannedDevice,
  newConfig: SerialPortProxySetupItemNewConfig
): Promise<boolean> => {
  if (!device.type) {
    return false;
  }

  const params = getDeviceSetupParams(device, newConfig);
  if (params) {
    await serialPortProxy.Setup(params);
  }

  return true;
};

function getSerialNumberForDeviceSetupRPCCall(device: ScannedDevice): number | undefined {
  if (!device?.gotByFastScan) {
    return;
  }
  let numberSn: bigint;
  try {
    numberSn = BigInt(device.sn);
  } catch {
    return;
  }
  // In a fast modbus call we must use in sn parameter the same value as in 270, 271 registers
  // For MAP devices sn occupies 25 bits in 270, 271 registers and the rest most significant bits are set to 1
  const re = new RegExp('\\S*MAP\\d+\\S*');
  if (re.test(device.type)) {
    numberSn = numberSn + BigInt('4261412864'); // 0xFE000000
  }
  // Specifying SN will result fast modbus request
  return Number(numberSn);
}

const getDeviceSetupParams = (
  device: ScannedDevice,
  newConfig: SerialPortProxySetupItemNewConfig
): SerialPortProxySetupParams | undefined => {

  let params = {
    path: device.port,
    items: [],
  };

  let commonCfg: SerialPortProxySetupItem = {
    slave_id: device.address,
    baud_rate: device.baudRate,
    stop_bits: device.stopBits,
    parity: device.parity,
  };

  if (newConfig.slave_id !== undefined && device.address !== newConfig.slave_id) {
    let item = Object.assign({}, commonCfg);
    const sn = getSerialNumberForDeviceSetupRPCCall(device);
    if (sn !== undefined) {
      item.sn = sn;
    }
    item.cfg = {
      slave_id: getIntAddress(newConfig.slave_id),
    };
    params.items.push(item);
    commonCfg.slave_id = item.cfg.slave_id;
  }

  if (newConfig.baud_rate !== undefined && device.baudRate !== newConfig.baud_rate) {
    let item = Object.assign({}, commonCfg);
    item.cfg = { baud_rate: newConfig.baud_rate };
    params.items.push(item);
    commonCfg.baud_rate = item.cfg.baud_rate;
  }

  if (newConfig.stop_bits !== undefined && device.stopBits !== newConfig.stop_bits) {
    // Devices with fast modbus support accept both 1 and 2 stop bits
    // So it is not a misconfiguration if the setting differs from port's one
    if (!device.gotByFastScan) {
      let item = Object.assign({}, commonCfg);
      item.cfg = { stop_bits: newConfig.stop_bits };
      params.items.push(item);
      commonCfg.stop_bits = item.cfg.stop_bits;
    }
  }

  if (newConfig.parity !== undefined && device.parity !== newConfig.parity) {
    const mapping = {
      O: 1,
      E: 2,
    };
    let item = Object.assign({}, commonCfg);
    item.cfg = { parity: mapping[newConfig.parity] || 0 };
    params.items.push(item);
  }

  return params.items.length !== 0 ? params : undefined;
};
