import { type TableCellSortDirection } from '@/components/table/types';
import { type DeviceStore } from '@/stores/device';

export interface MqttChannelsPageProps {
  store: DeviceStore;
}

export type MqttChannelsSortColumn = 'id' | 'type' | 'topic' | 'value' | 'status';
export type SortDirection = TableCellSortDirection;
