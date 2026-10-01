import ConfigsStore from './configs-store';
import { type ConfigListItem } from './types';

const configsStore = new ConfigsStore();

// `configFile.editor` value opting a config into the new json-schema-editor
export const WB_JSON_EDITOR = 'wb-json-editor';

export {
  type ConfigListItem,
  ConfigsStore,
  configsStore
};
