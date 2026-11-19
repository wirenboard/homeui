import type { DeviceTypeDescriptionGroup } from '@/stores/device-manager/types';
import { createRpcProxy } from './rpc';

interface TemplatesUploadParams {
  content: string;
  filename: string;
  lang?: string;
  force?: boolean;
}

interface TemplatesDeleteParams {
  type: string;
  lang?: string;
  force?: boolean;
}

interface TemplatesResult {
  types: DeviceTypeDescriptionGroup[];
}

interface SerialTemplatesProxyMethods {
  Upload: (params: TemplatesUploadParams) => Promise<TemplatesResult>;
  Delete: (params: TemplatesDeleteParams) => Promise<TemplatesResult>;
}

export const serialTemplatesProxy = createRpcProxy<SerialTemplatesProxyMethods>(
  'wb-mqtt-serial/templates',
  ['Upload', 'Delete'],
);
