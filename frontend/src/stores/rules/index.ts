import RulesStore from './rules-store';

export { registerRulesTab } from './register-rules-tab';
export type {
  Rule,
  RuleError,
  RuleFetchData,
  RuleLevel,
  RuleListItem,
  RuleLog,
  RuleRuntimeError,
  RuleSaveData,
  LocalTsDiag,
  TsCheckDiag,
  TsCheckResult,
  TsCheckStatus
} from './types';

const rulesStore = new RulesStore();
export {
  rulesStore,
  RulesStore
};
