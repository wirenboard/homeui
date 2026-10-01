import RulesStore from './rules-store';

export { registerRulesTab } from './register-rules-tab';

const rulesStore = new RulesStore();
export {
  rulesStore,
  RulesStore
};
