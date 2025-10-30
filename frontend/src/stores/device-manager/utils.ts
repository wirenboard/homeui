import type { PortTabSerialConfig, PortTabTcpConfig, PortTabConfig } from './port-tab/types';
import type { RpcTcpPortConfig, RpcSerialPortConfig } from './types';

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
