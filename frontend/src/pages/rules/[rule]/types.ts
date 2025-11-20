import { type DeviceStore } from '@/stores/device';
import { type RulesStore } from '@/stores/rules';

export interface RulePageProps {
  rulesStore: RulesStore;
  devicesStore: DeviceStore;
}
