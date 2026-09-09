import type { CardAction } from '@/components/card/types';

export interface DevicesViewPrefs {
  columns: number | null;
  order: string[][] | null;
}

export interface DeviceCardProps {
  deviceId: string;
  actions: CardAction[];
}
