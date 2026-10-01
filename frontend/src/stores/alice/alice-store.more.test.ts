import AliceStore from './alice-store';
import * as api from './api';

vi.mock('@/stores/alice', () => ({ DefaultRoom: 'default' }));
vi.mock('@/utils/id', () => ({ generateNextId: vi.fn((_items, base) => `${base}copy`) }));

vi.mock('./api', () => ({
  checkIsAliceAvailable: vi.fn(),
  getAliceInfo: vi.fn(),
  getAliceLinkStatus: vi.fn(),
  createAliceLink: vi.fn(),
  addRoom: vi.fn(),
  updateRoom: vi.fn(),
  deleteRoom: vi.fn(),
  addDevice: vi.fn(),
  updateDevice: vi.fn(),
  deleteDevice: vi.fn(),
  getAliceIntegrationStatus: vi.fn(),
  toggleAliceIntegration: vi.fn(),
  unlinkController: vi.fn(),
}));

describe('AliceStore', () => {
  let store: AliceStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new AliceStore();
  });

  test('initializes with empty collections', () => {
    expect(store.rooms.size).toBe(0);
    expect(store.devices.size).toBe(0);
    expect(store.isAvailable).toBeNull();
    expect(store.isIntegrationEnabled).toBe(false);
  });

  test('checkIsAvailable sets true', async () => {
    (api as any).checkIsAliceAvailable.mockResolvedValue(true);
    await store.checkIsAvailable();
    expect(store.isAvailable).toBe(true);
  });

  test('checkIsAvailable sets false on error', async () => {
    (api as any).checkIsAliceAvailable.mockRejectedValue(new Error('fail'));
    await store.checkIsAvailable();
    expect(store.isAvailable).toBe(false);
  });

  test('fetchIntegrationStatus sets enabled', async () => {
    (api as any).getAliceIntegrationStatus.mockResolvedValue({ enabled: true });
    await store.fetchIntegrationStatus();
    expect(store.isIntegrationEnabled).toBe(true);
  });

  test('fetchIntegrationStatus sets false and rethrows on error', async () => {
    (api as any).getAliceIntegrationStatus.mockRejectedValue(new Error('fail'));
    await expect(store.fetchIntegrationStatus()).rejects.toThrow('fail');
    expect(store.isIntegrationEnabled).toBe(false);
  });

  test('fetchData populates rooms and devices', async () => {
    (api as any).getAliceInfo.mockResolvedValue({
      rooms: { r1: { name: 'Living', devices: [] } },
      devices: { d1: { name: 'Lamp', room_id: 'r1' } },
    });
    await store.fetchData();
    expect(store.rooms.size).toBe(1);
    expect(store.devices.size).toBe(1);
    expect(store.rooms.get('r1').name).toBe('Living');
  });

  test('addRoom adds to rooms map', async () => {
    (api as any).addRoom.mockResolvedValue({ r2: { name: 'Kitchen', devices: [] } });
    const key = await store.addRoom('Kitchen');
    expect(key).toBe('r2');
    expect(store.rooms.get('r2').name).toBe('Kitchen');
  });

  test('updateRoom updates room in map', async () => {
    store.rooms.set('r1', { name: 'Old', devices: [] } as any);
    (api as any).updateRoom.mockResolvedValue({ name: 'New', devices: [] });
    await store.updateRoom('r1', { name: 'New' });
    expect(store.rooms.get('r1').name).toBe('New');
  });

  test('deleteDevice removes device and updates room', async () => {
    store.rooms.set('r1', { name: 'Room', devices: ['d1', 'd2'] } as any);
    store.devices.set('d1', { name: 'Lamp', room_id: 'r1' } as any);
    store.devices.set('d2', { name: 'Fan', room_id: 'r1' } as any);
    (api as any).deleteDevice.mockResolvedValue(undefined);

    await store.deleteDevice('d1');
    expect(store.devices.has('d1')).toBe(false);
    expect(store.rooms.get('r1').devices).toEqual(['d2']);
  });

  test('deleteDevice with default room only removes device', async () => {
    store.devices.set('d1', { name: 'Lamp', room_id: 'default' } as any);
    (api as any).deleteDevice.mockResolvedValue(undefined);

    await store.deleteDevice('d1');
    expect(store.devices.has('d1')).toBe(false);
  });

  test('setIntegrationEnabled toggles and updates state', async () => {
    (api as any).toggleAliceIntegration.mockResolvedValue(undefined);
    await store.setIntegrationEnabled(true);
    expect(store.isIntegrationEnabled).toBe(true);
    expect((api as any).toggleAliceIntegration).toHaveBeenCalledWith(true);
  });

  test('roomList returns array from map', () => {
    store.rooms.set('r1', { name: 'A', devices: [] } as any);
    store.rooms.set('r2', { name: 'B', devices: [] } as any);
    expect(store.roomList).toHaveLength(2);
  });

  test('copyDevice creates copy with new name', async () => {
    store.rooms.set('r1', { name: 'Room', devices: ['d1'] } as any);
    store.devices.set('d1', { name: 'Lamp', room_id: 'r1' } as any);
    (api as any).addDevice.mockResolvedValue({ d2: { name: 'Lamp copy', room_id: 'r1' } });

    const key = await store.copyDevice({ name: 'Lamp', room_id: 'r1' } as any);
    expect(key).toBe('d2');
    expect(store.devices.has('d2')).toBe(true);
  });
});
