import type { ScannedDevice } from '../types';
import { setupDevice } from './common';

const makeDevice = (overrides: Partial<ScannedDevice> = {}): ScannedDevice => ({
  title: 'Device',
  sn: '4294967295',
  address: 1,
  type: 'WB-MR6C',
  port: '/dev/ttyRS485-1',
  baudRate: 9600,
  parity: 'N',
  stopBits: 2,
  gotByFastScan: true,
  bootloaderMode: false,
  ...overrides,
});

// Changes the slave id, the only setup item that carries the serial number
const setupSerialNumber = async (device: ScannedDevice) => {
  const proxy = { Setup: vi.fn().mockResolvedValue(undefined) };
  await setupDevice(proxy, device, { slave_id: 2 });
  return proxy.Setup.mock.calls[0][0].items[0].sn;
};

describe('setupDevice serial number for a fast Modbus request', () => {
  test('passes the largest uint32 serial number exactly', async () => {
    expect(await setupSerialNumber(makeDevice())).toBe(4294967295);
  });

  test('adds 0xFE000000 for MAP devices', async () => {
    expect(await setupSerialNumber(makeDevice({ type: 'WB-MAP12H', sn: '33554431' }))).toBe(0xFE000000 + 33554431);
  });

  test('omits the serial number for a device not found by fast scan', async () => {
    expect(await setupSerialNumber(makeDevice({ gotByFastScan: false }))).toBeUndefined();
  });

  test('omits a serial number that is not an integer', async () => {
    expect(await setupSerialNumber(makeDevice({ sn: 'abc' }))).toBeUndefined();
  });
});
