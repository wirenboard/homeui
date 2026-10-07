import type { ConfigJson } from '@/pages/settings/device-manager/config-editor/stores/types';
import type { DeviceTypeDescriptionGroup } from '@/stores/device-manager/types';
import type { JsonSchema } from '@/stores/json-schema-editor';
import { exactNumberReviver } from '@/utils/exact-number';
import { createRpcProxy } from './rpc';

interface SerialLoadResult {
  config: ConfigJson;
  schema: JsonSchema;
  types: DeviceTypeDescriptionGroup[];
}

interface SerialProxyMethods {
  Load: (params: { lang: string }) => Promise<SerialLoadResult>;
  GetSchema: (params: { type: string }) => Promise<JsonSchema>;
  Save: (params: { config: ConfigJson }) => Promise<void>;
}

export const serialProxy = createRpcProxy<SerialProxyMethods>(
  'wb-mqtt-serial/config',
  [{ name: 'Load', reviver: exactNumberReviver }, 'GetSchema', 'Save'],
);
