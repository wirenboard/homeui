// @vitest-environment happy-dom
import { EmbeddedSoftware } from './embedded-software-store';

const portConfig = { path: '/dev/ttyRS485-1', baudRate: 115200, parity: 'N', dataBits: 8, stopBits: 2 } as any;

const firmwareInfo = {
  fw: '1.1.0',
  available_fw: '1.2.1',
  fw_has_update: true,
  bootloader: '1.5.7',
  available_bootloader: '1.5.7',
  bootloader_has_update: false,
  can_update: true,
  components: {},
  model: 'WB-DALI',
};

const configBusyError = { code: -32000, data: 'config-busy', message: 'Server error' };

const makeProxy = () => ({
  hasMethod: vi.fn().mockResolvedValue(true),
  GetFirmwareInfo: vi.fn(),
  Update: vi.fn(),
  ClearError: vi.fn(),
  Restore: vi.fn(),
});

describe('EmbeddedSoftware.updateVersion', () => {
  let startTime: number;

  beforeEach(() => {
    vi.useFakeTimers();
    startTime = Date.now();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the known version on config-busy and rereads it after a delay', async () => {
    const proxy = makeProxy();
    proxy.GetFirmwareInfo.mockResolvedValueOnce(firmwareInfo);
    const software = new EmbeddedSoftware(proxy as any);
    await software.updateVersion(12, portConfig);
    expect(software.hasUpdate).toBe(true);

    proxy.GetFirmwareInfo.mockRejectedValueOnce(configBusyError).mockResolvedValueOnce(firmwareInfo);
    await software.updateVersion(12, portConfig);
    expect(software.hasUpdate).toBe(true);
    expect(proxy.GetFirmwareInfo).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(5000);
    expect(proxy.GetFirmwareInfo).toHaveBeenCalledTimes(3);
    expect(software.firmware.available).toBe('1.2.1');
  });

  it('rereads the version after a delay when the RPC request times out', async () => {
    const proxy = makeProxy();
    proxy.GetFirmwareInfo
      .mockRejectedValueOnce({ data: 'MqttTimeoutError', message: 'MQTT RPC request timed out' })
      .mockResolvedValueOnce(firmwareInfo);
    const software = new EmbeddedSoftware(proxy as any);
    await software.updateVersion(12, portConfig);
    expect(proxy.GetFirmwareInfo).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000);
    expect(proxy.GetFirmwareInfo).toHaveBeenCalledTimes(2);
    expect(software.hasUpdate).toBe(true);
  });

  it('schedules a single reread when concurrent calls both get config-busy', async () => {
    const proxy = makeProxy();
    proxy.GetFirmwareInfo
      .mockRejectedValueOnce(configBusyError)
      .mockRejectedValueOnce(configBusyError)
      .mockResolvedValue(firmwareInfo);
    const software = new EmbeddedSoftware(proxy as any);
    await Promise.all([software.updateVersion(12, portConfig), software.updateVersion(12, portConfig)]);

    await vi.advanceTimersByTimeAsync(5000);
    expect(proxy.GetFirmwareInfo).toHaveBeenCalledTimes(3);
  });

  it('retries config-busy after 1, 2 and 4 s and then every 10 s', async () => {
    const proxy = makeProxy();
    proxy.GetFirmwareInfo.mockRejectedValue(configBusyError);
    const software = new EmbeddedSoftware(proxy as any);
    await software.updateVersion(12, portConfig);

    for (const [elapsedMs, calls] of [[999, 1], [1000, 2], [3000, 3], [7000, 4], [17000, 5], [27000, 6]]) {
      await vi.advanceTimersByTimeAsync(elapsedMs - Date.now() + startTime);
      expect(proxy.GetFirmwareInfo).toHaveBeenCalledTimes(calls);
    }
  });

  it('clears the version after 30 retries that all get config-busy', async () => {
    const proxy = makeProxy();
    proxy.GetFirmwareInfo.mockResolvedValueOnce(firmwareInfo).mockRejectedValue(configBusyError);
    const software = new EmbeddedSoftware(proxy as any);
    await software.updateVersion(12, portConfig);
    await software.updateVersion(12, portConfig);

    // 1 + 2 + 4 s and then 27 retries every 10 s
    await vi.advanceTimersByTimeAsync(276 * 1000);
    expect(proxy.GetFirmwareInfo).toHaveBeenCalledTimes(31);
    expect(software.hasUpdate).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);
    expect(proxy.GetFirmwareInfo).toHaveBeenCalledTimes(32);
    expect(software.hasUpdate).toBe(false);

    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(proxy.GetFirmwareInfo).toHaveBeenCalledTimes(32);
  });

  it('starts counting retries anew after a successful read', async () => {
    const proxy = makeProxy();
    proxy.GetFirmwareInfo
      .mockRejectedValueOnce(configBusyError)
      .mockRejectedValueOnce(configBusyError)
      .mockRejectedValueOnce(configBusyError)
      .mockResolvedValueOnce(firmwareInfo)
      .mockRejectedValueOnce(configBusyError)
      .mockResolvedValueOnce(firmwareInfo);
    const software = new EmbeddedSoftware(proxy as any);
    await software.updateVersion(12, portConfig);
    await vi.advanceTimersByTimeAsync(7000);
    expect(proxy.GetFirmwareInfo).toHaveBeenCalledTimes(4);

    await software.updateVersion(12, portConfig);
    await vi.advanceTimersByTimeAsync(1000);
    expect(proxy.GetFirmwareInfo).toHaveBeenCalledTimes(6);
    expect(software.hasUpdate).toBe(true);
  });

  it('clears the version at once on any other error', async () => {
    const proxy = makeProxy();
    proxy.GetFirmwareInfo.mockResolvedValueOnce(firmwareInfo).mockRejectedValueOnce({ code: -32000, data: 'other' });
    const software = new EmbeddedSoftware(proxy as any);
    await software.updateVersion(12, portConfig);
    await software.updateVersion(12, portConfig);

    expect(software.hasUpdate).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(proxy.GetFirmwareInfo).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending reread when the device disconnects', async () => {
    const proxy = makeProxy();
    proxy.GetFirmwareInfo.mockRejectedValueOnce(configBusyError);
    const software = new EmbeddedSoftware(proxy as any);
    await software.updateVersion(12, portConfig);
    software.clearVersion();

    await vi.advanceTimersByTimeAsync(5000);
    expect(proxy.GetFirmwareInfo).toHaveBeenCalledTimes(1);
  });
});
