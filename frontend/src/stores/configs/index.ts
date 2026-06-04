import ConfigsStore from './configs-store';
import { type ConfigListItem } from './types';

const configsStore = new ConfigsStore();

export {
  type ConfigListItem,
  ConfigsStore,
  configsStore
};
