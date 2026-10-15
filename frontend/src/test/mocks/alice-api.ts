import type { Mock } from 'vitest';

export const checkIsAliceAvailableMock: Mock = vi.fn();
export const getAliceIntegrationStatusMock: Mock = vi.fn();
export const getAliceInfoMock: Mock = vi.fn();
export const getAliceLinkStatusMock: Mock = vi.fn();
export const createAliceLinkMock: Mock = vi.fn();
export const addRoomMock: Mock = vi.fn();
export const updateRoomMock: Mock = vi.fn();
export const deleteRoomMock: Mock = vi.fn();
export const addDeviceMock: Mock = vi.fn();
export const updateDeviceMock: Mock = vi.fn();
export const deleteDeviceMock: Mock = vi.fn();
export const toggleAliceIntegrationMock: Mock = vi.fn();
export const unlinkControllerMock: Mock = vi.fn();

export {
  checkIsAliceAvailableMock as checkIsAliceAvailable,
  getAliceIntegrationStatusMock as getAliceIntegrationStatus,
  getAliceInfoMock as getAliceInfo,
  getAliceLinkStatusMock as getAliceLinkStatus,
  createAliceLinkMock as createAliceLink,
  addRoomMock as addRoom,
  updateRoomMock as updateRoom,
  deleteRoomMock as deleteRoom,
  addDeviceMock as addDevice,
  updateDeviceMock as updateDevice,
  deleteDeviceMock as deleteDevice,
  toggleAliceIntegrationMock as toggleAliceIntegration,
  unlinkControllerMock as unlinkController
};
