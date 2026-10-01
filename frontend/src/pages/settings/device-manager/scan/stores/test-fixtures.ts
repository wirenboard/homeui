// Shared test fixtures for the scan-store tests (scan-page-store.test.ts and
// new-devices-scan-page-store.test.ts). The two suites exercise tightly-coupled stores
// (NewDevicesScanPageStore wraps CommonScanStore) against the same FullScannedDevice / ConfiguredDevices
// shapes, so the builders live here to keep them in sync when those shapes change.
import { type DeviceTypesStore } from '@/stores/device-manager';
import { ConfiguredDevices } from '../../config-editor/stores/configured-devices';
import { type FullScannedDevice } from './types';

export const makeDeviceTypesStore = (): DeviceTypesStore =>
  ({
    findNotDeprecatedDeviceTypes: () => ['wb-map12'],
    getName: (type: string) => `name:${type}`,
    isModbusDevice: () => true,
    getDeviceSignatures: () => ['MAP12'],
  } as unknown as DeviceTypesStore);

export const makeConfiguredDevices = (
  deviceTypesStore: DeviceTypesStore,
  devices: { slaveId: string; sn: string; deviceType?: string }[] = [],
) =>
  new ConfiguredDevices(
    [
      {
        path: '/dev/ttyRS485-1',
        portType: 'serial',
        baseConfig: {},
        children: devices.map((d) => ({
          slaveId: d.slaveId,
          editedData: { device_type: d.deviceType ?? 'wb-map12', sn: d.sn },
        })),
      },
    ],
    deviceTypesStore,
  );

export interface ScannedOverrides {
  uuid?: string;
  sn?: string;
  slaveId?: number;
  path?: string;
  configuredDeviceType?: string;
}

export const makeScanned = (overrides: ScannedOverrides = {}): FullScannedDevice =>
  ({
    uuid: overrides.uuid ?? 'uuid',
    port: { path: overrides.path ?? '/dev/ttyRS485-1' },
    cfg: {
      slave_id: overrides.slaveId ?? 5,
      baud_rate: 9600,
      parity: 'N',
      data_bits: 8,
      stop_bits: 2,
    },
    title: 'Scanned device',
    sn: overrides.sn ?? '',
    device_signature: 'MAP12',
    fw_signature: '',
    configured_device_type: overrides.configuredDeviceType ?? '',
    last_seen: 0,
    bootloader_mode: false,
    errors: [],
    fw: { version: '1.0', ext_support: false, fast_modbus_command: 0 },
  } as unknown as FullScannedDevice);
