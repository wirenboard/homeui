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

export const checkIsAliceAvailable = async () => request.get<boolean>(
  '/api/integrations/alice/available'
).then(({ data }) => data);

export const getAliceInfo = async () => request.get<AliceFetchData>(
  '/api/integrations/alice'
).then(({ data }) => data);

export const addRoom = async (name: string) => request.post<AddRoomFetchData>(
  '/api/integrations/alice/room',
  { name }
);

export const updateRoom = async (id: string, body: AliceRoomUpdateParams) => request.put<Room>(
  `/api/integrations/alice/room/${id}`,
  body
).then(({ data }) => data);

export const deleteRoom = async (id: string) => request.delete<SuccessMessageFetch>(
  `/api/integrations/alice/room/${id}`
).then(({ data }) => data);

export const addDevice = async (body: AddDeviceParams) => request.post<AddDeviceFetchData>(
  '/api/integrations/alice/device',
  body
).then(({ data }) => data);

export const updateDevice = async (id: string, body: Partial<SmartDevice>) => request.put<SmartDevice>(
  `/api/integrations/alice/device/${id}`,
  body
).then(({ data }) => data);

export const deleteDevice = async (id: string) => request.delete<SuccessMessageFetch>(
  `/api/integrations/alice/device/${id}`
).then(({ data }) => data);
