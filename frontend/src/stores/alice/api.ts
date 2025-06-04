import { request } from '@/utils/request';
import type {
  AddDeviceFetchData,
  AddDeviceParams,
  AddRoomFetchData,
  AliceFetchData,
  AliceRoomUpdateParams,
  Room,
  SmartDevice,
  SuccessMessageFetch
} from './types';

export const getAliceInfo = async () => request<AliceFetchData>(
  '/api/integrations/alice'
);

export const addRoom = async (name: string) => request<AddRoomFetchData>(
  '/api/integrations/alice/room',
  { method: 'POST', body: { name } }
);

export const updateRoom = async (id: string, body: AliceRoomUpdateParams) => request<Room>(
  `/api/integrations/alice/room/${id}`,
  { method: 'PUT', body }
);

export const deleteRoom = async (id: string) => request<SuccessMessageFetch>(
  `/api/integrations/alice/room/${id}`,
  { method: 'DELETE' }
);

export const addDevice = async (body: AddDeviceParams) => request<AddDeviceFetchData>(
  '/api/integrations/alice/device',
  { method: 'POST', body }
);

export const updateDevice = async (id: string, body: Partial<SmartDevice>) => request<SmartDevice>(
  `/api/integrations/alice/device/${id}`,
  { method: 'PUT', body }
);

export const deleteDevice = async (id: string) => request<SuccessMessageFetch>(
  `/api/integrations/alice/device/${id}`,
  { method: 'DELETE' }
);
