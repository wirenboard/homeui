import ConfiguratorStore, { ConfigFormatError, ConfigParseError } from './configurator-store';

const configuratorStore = new ConfiguratorStore();

export { ConfiguratorStore, ConfigFormatError, ConfigParseError, configuratorStore };
export {
  CHANNEL_CLASSES, classify, DEVICE_TYPES, findType, NO_PRESET, primaryRole, ROLES, TYPE_CATEGORIES
} from './catalog';
export { channelServices, ownRowServices, splitKey, stable, topicOf } from './model';
export type * from './types';
