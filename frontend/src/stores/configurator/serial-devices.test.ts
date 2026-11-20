import { serialProxy } from '@/services';
import { loadSerialDevices } from './serial-devices';

vi.mock('@/services', () => ({ serialProxy: { Load: vi.fn() } }));

describe('loadSerialDevices', () => {
  it('maps the enabled devices of the config that have a recipe by their MQTT id', async () => {
    vi.mocked(serialProxy.Load).mockResolvedValue({
      config: {
        ports: [
          {
            devices: [
              { device_type: 'WB-MR6C v.3', slave_id: '137', curtain1_mode: 1 },
              { device_type: 'WB-MSW v.4', slave_id: '90', id: 'hall' },
              { device_type: 'WB-MSW v.4', slave_id: '91', enabled: false },
              { device_type: 'WB-LED', slave_id: '42' },
            ],
          },
          {},
        ],
      },
    } as any);

    const devices = await loadSerialDevices();

    expect(Object.keys(devices)).toEqual(['wb-mr6cv3_137', 'hall']);
    expect(devices['wb-mr6cv3_137']).toMatchObject({ deviceType: 'WB-MR6C v.3', params: { curtain1_mode: 1 } });
  });

  it('returns nothing when the config cannot be loaded', async () => {
    vi.mocked(serialProxy.Load).mockRejectedValue(new Error('no rights'));

    expect(await loadSerialDevices()).toEqual({});
  });
});
