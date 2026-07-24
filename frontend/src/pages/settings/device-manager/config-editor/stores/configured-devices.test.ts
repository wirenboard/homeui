// @vitest-environment happy-dom
import { type DeviceTypesStore } from '@/stores/device-manager';
import { ConfiguredDevices } from './configured-devices';

// Minimal DeviceTypesStore: every type is a modbus device except 'non-modbus', so its device is
// excluded from the configured-devices list (and therefore from the serial-number set).
const makeDeviceTypesStore = (): DeviceTypesStore =>
  ({
    isModbusDevice: (type: string) => type !== 'non-modbus',
    getDeviceSignatures: () => ['SIG'],
  } as unknown as DeviceTypesStore);

const makeDeviceTab = (slaveId: string, sn: unknown, deviceType = 'wb-map12') => ({
  slaveId,
  editedData: { device_type: deviceType, sn },
});

const makePortTab = (path: string, children: ReturnType<typeof makeDeviceTab>[]) => ({
  path,
  portType: 'serial',
  baseConfig: {},
  children,
});

describe('ConfiguredDevices.getConfiguredDevicesBySerialNumber', () => {
  it('indexes the configured devices by their non-empty serial numbers across all ports, keeping the ' +
    'configured device type', () => {
    const portTabs = [
      makePortTab('/dev/ttyRS485-1', [makeDeviceTab('10', '111'), makeDeviceTab('11', '112')]),
      makePortTab('/dev/ttyRS485-2', [makeDeviceTab('12', '222')]),
    ];

    const index = new ConfiguredDevices(portTabs, makeDeviceTypesStore()).getConfiguredDevicesBySerialNumber();

    expect(new Set(index.keys())).toEqual(new Set(['111', '112', '222']));
    // The device type is retrievable by sn — that is what lets a re-scan show the configured name.
    expect(index.get('111')?.deviceType).toBe('wb-map12');
  });

  it('excludes empty, absent and null serial numbers, and normalises numeric ones to strings', () => {
    const portTabs = [
      makePortTab('/dev/ttyRS485-1', [
        makeDeviceTab('10', '111'),
        makeDeviceTab('11', ''),
        makeDeviceTab('12', undefined),
        makeDeviceTab('13', null),
        makeDeviceTab('14', 4285517795),
      ]),
    ];

    const index = new ConfiguredDevices(portTabs, makeDeviceTypesStore()).getConfiguredDevicesBySerialNumber();

    expect(new Set(index.keys())).toEqual(new Set(['111', '4285517795']));
  });

  it('does not index non-modbus devices', () => {
    const portTabs = [
      makePortTab('/dev/ttyRS485-1', [
        makeDeviceTab('10', '111'),
        makeDeviceTab('11', '999', 'non-modbus'),
      ]),
    ];

    const index = new ConfiguredDevices(portTabs, makeDeviceTypesStore()).getConfiguredDevicesBySerialNumber();

    expect(new Set(index.keys())).toEqual(new Set(['111']));
  });

  it('returns an empty map for an empty config', () => {
    const index = new ConfiguredDevices([], makeDeviceTypesStore()).getConfiguredDevicesBySerialNumber();

    expect(index.size).toBe(0);
  });
});
