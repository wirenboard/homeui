import { type TableCellSortDirection } from '@/components/table/types';
import { type DevicesStore } from '@/stores/devices';

export interface MqttChannelsPageProps {
  store: DevicesStore;
}

export type MqttChannelsSortColumn = 'id' | 'type' | 'topic' | 'value' | 'status';
export type SortDirection = TableCellSortDirection;
