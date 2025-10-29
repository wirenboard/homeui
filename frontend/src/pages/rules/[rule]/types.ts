import { DeviceStore } from '@/stores/device';
import { RulesStore } from '@/stores/rules';

export interface RulePageProps {
  rulesStore: RulesStore;
  devicesStore: DeviceStore;
  hasRights: boolean;
}
