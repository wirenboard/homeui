import {
  addDeviceMock,
  addRoomMock,
  checkIsAliceAvailableMock,
  createAliceLinkMock,
  deleteDeviceMock,
  deleteRoomMock,
  getAliceInfoMock,
  getAliceIntegrationStatusMock,
  getAliceLinkStatusMock,
  toggleAliceIntegrationMock,
  unlinkControllerMock,
  updateDeviceMock,
  updateRoomMock,
} from '@/test/mocks/alice-api';
import AliceStore from './alice-store';
import { DefaultRoom } from './constants';
import type { AliceFetchData, Room, SmartDevice } from './types';

vi.mock('@/stores/alice', async () => import('./constants'));
vi.mock('./api', () => import('@/test/mocks/alice-api'));
vi.mock('@/utils/id', () => import('@/test/mocks/utils-id'));

const makeDevice = (overrides: Partial<SmartDevice> = {}): SmartDevice => ({
  name: 'Lamp',
  description: '',
  room_id: 'room1',
  type: 'devices.types.light',
  status_info: { reportable: false },
  properties: [],
  capabilities: [],
  ...overrides,
});

describe('AliceStore', () => {
  let store: AliceStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new AliceStore();
  });

  describe('checkIsAvailable', () => {
    test('sets isAvailable to true', async () => {
      checkIsAliceAvailableMock.mockResolvedValue(true);
      await store.checkIsAvailable();
      expect(store.isAvailable).toBe(true);
    });

    test('sets isAvailable to false on error', async () => {
      checkIsAliceAvailableMock.mockRejectedValue(new Error('fail'));
      await store.checkIsAvailable();
      expect(store.isAvailable).toBe(false);
    });
  });

  describe('fetchIntegrationStatus', () => {
    test('sets isIntegrationEnabled from response', async () => {
      getAliceIntegrationStatusMock.mockResolvedValue({ enabled: true });
      await store.fetchIntegrationStatus();
      expect(store.isIntegrationEnabled).toBe(true);
    });

    test('sets isIntegrationEnabled to false and rethrows on error', async () => {
      store.isIntegrationEnabled = true;
      getAliceIntegrationStatusMock.mockRejectedValue(new Error('fail'));

      await expect(store.fetchIntegrationStatus()).rejects.toThrow('fail');
      expect(store.isIntegrationEnabled).toBe(false);
    });
  });

  describe('fetchData', () => {
    test('populates rooms and devices', async () => {
      const data: AliceFetchData = {
        rooms: { room1: { name: 'Living', devices: ['d1'] } },
        devices: { d1: makeDevice() },
      };
      getAliceInfoMock.mockResolvedValue(data);

      const result = await store.fetchData();

      expect(result).toEqual(data);
      expect(store.rooms.get('room1')).toEqual({ name: 'Living', devices: ['d1'] });
      expect(store.devices.get('d1')).toBeDefined();
    });
  });

  describe('fetchLinkStatus', () => {
    test('delegates to API', async () => {
      getAliceLinkStatusMock.mockResolvedValue({ linked: true });
      const result = await store.fetchLinkStatus();
      expect(result).toEqual({ linked: true });
    });
  });

  describe('createLink', () => {
    test('delegates to API', async () => {
      createAliceLinkMock.mockResolvedValue({ link_url: 'https://example.com' });
      const result = await store.createLink();
      expect(result).toEqual({ link_url: 'https://example.com' });
    });
  });

  describe('addRoom', () => {
    test('adds room to map and returns key', async () => {
      const room: Room = { name: 'Kitchen', devices: [] };
      addRoomMock.mockResolvedValue({ room2: room });

      const key = await store.addRoom('Kitchen');

      expect(key).toBe('room2');
      expect(store.rooms.get('room2')).toEqual(room);
    });
  });

  describe('updateRoom', () => {
    test('updates room in map', async () => {
      store.rooms.set('room1', { name: 'Old', devices: [] });
      const updated: Room = { name: 'New', devices: ['d1'] };
      updateRoomMock.mockResolvedValue(updated);

      await store.updateRoom('room1', { name: 'New', devices: ['d1'] });

      expect(store.rooms.get('room1')).toEqual(updated);
    });
  });

  describe('deleteRoom', () => {
    test('delegates to API', async () => {
      deleteRoomMock.mockResolvedValue({ message: 'ok' });
      const result = await store.deleteRoom('room1');
      expect(result).toEqual({ message: 'ok' });
      expect(deleteRoomMock).toHaveBeenCalledWith('room1');
    });
  });

  describe('addDevice', () => {
    test('calls API and returns key', async () => {
      addDeviceMock.mockResolvedValue({ d1: makeDevice() });

      const key = await store.addDevice({ name: 'Lamp', room_id: 'room1', type: 'light' });

      expect(key).toBe('d1');
    });
  });

  describe('updateDevice', () => {
    test('delegates to API', async () => {
      const device = makeDevice({ name: 'Updated' });
      updateDeviceMock.mockResolvedValue(device);

      const result = await store.updateDevice('d1', { name: 'Updated' });
      expect(result).toEqual(device);
    });
  });

  describe('deleteDevice', () => {
    test('removes device from map and from room devices list', async () => {
      store.rooms.set('room1', { name: 'Living', devices: ['d1', 'd2'] });
      store.devices.set('d1', makeDevice({ room_id: 'room1' }));
      store.devices.set('d2', makeDevice({ room_id: 'room1' }));
      deleteDeviceMock.mockResolvedValue(undefined);

      await store.deleteDevice('d1');

      expect(store.devices.has('d1')).toBe(false);
      expect(store.rooms.get('room1').devices).toEqual(['d2']);
    });

    test('skips room update for devices in DefaultRoom', async () => {
      store.rooms.set(DefaultRoom, { name: 'No Room', devices: ['d1'] });
      store.devices.set('d1', makeDevice({ room_id: DefaultRoom }));
      deleteDeviceMock.mockResolvedValue(undefined);

      await store.deleteDevice('d1');

      expect(store.devices.has('d1')).toBe(false);
      expect(store.rooms.get(DefaultRoom).devices).toEqual(['d1']);
    });
  });

  describe('copyDevice', () => {
    test('creates copy with generated name and updates room', async () => {
      const device = makeDevice({ name: 'Lamp', room_id: 'room1' });
      store.devices.set('d1', device);
      store.rooms.set('room1', { name: 'Living', devices: ['d1'] });

      const copied = makeDevice({ name: 'Lamp 1', room_id: 'room1' });
      addDeviceMock.mockResolvedValue({ d2: copied });

      const key = await store.copyDevice(device);

      expect(key).toBe('d2');
      expect(store.devices.get('d2')).toEqual(copied);
      expect(store.rooms.get('room1').devices).toContain('d2');
    });
  });

  describe('setIntegrationEnabled', () => {
    test('calls API and updates state', async () => {
      toggleAliceIntegrationMock.mockResolvedValue({ message: 'ok' });

      await store.setIntegrationEnabled(true);

      expect(toggleAliceIntegrationMock).toHaveBeenCalledWith(true);
      expect(store.isIntegrationEnabled).toBe(true);
    });
  });

  describe('roomList', () => {
    test('returns entries from rooms map', () => {
      store.rooms.set('r1', { name: 'A', devices: [] });
      store.rooms.set('r2', { name: 'B', devices: [] });

      expect(store.roomList).toEqual([
        ['r1', { name: 'A', devices: [] }],
        ['r2', { name: 'B', devices: [] }],
      ]);
    });
  });

  describe('unlinkController', () => {
    test('delegates to API', async () => {
      unlinkControllerMock.mockResolvedValue({ message: 'ok' });
      const result = await store.unlinkController();
      expect(result).toEqual({ message: 'ok' });
    });
  });
});
