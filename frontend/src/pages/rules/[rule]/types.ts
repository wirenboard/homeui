import { type DevicesStore } from '@/stores/devices';
import { type RulesStore } from '@/stores/rules';

export interface RulePageProps {
  rulesStore: RulesStore;
  devicesStore: DevicesStore;
}
