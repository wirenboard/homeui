import cloneDeep from 'lodash/cloneDeep';
import i18n from '@/i18n/config';
import { type DeviceTypesStore } from '@/stores/device-manager';
import { loadJsonSchema } from '@/stores/json-schema-editor';
import { formatError } from '@/utils/format-error';
import { type PortTab } from '../stores/port-tab-store';
import type { PortConfig } from './types';

export function getErrorMessage(error) {
  const CONFED_WRITE_FILE_ERROR = 1002;

  if (typeof error === 'object' && error.data === 'EditorError' && error.code === CONFED_WRITE_FILE_ERROR) {
    return i18n.t('device-manager.errors.write');
  }
  return formatError(error);
}

export function getDeviceSetupErrorMessage(device, error) {
  return i18n.t('device-manager.errors.setup', {
    device: `${device.title} (${device.address})`,
    error: getErrorMessage(error),
    interpolation: { escapeValue: false },
  });
}

export function getSerialPortSchema(schema) {
  return loadJsonSchema(schema.definitions.serialPort, schema.definitions);
}

export function getTcpPortSchema(schema) {
  return loadJsonSchema(schema.definitions.tcpPort, schema.definitions);
}

export function getModbusTcpPortSchema(schema) {
  return loadJsonSchema(schema.definitions.modbusTcpPort, schema.definitions);
}

export function getGeneralSettingsSchema(schema: any) {
  delete schema.definitions;
  delete schema.properties.ports;
  schema.description = '';
  return loadJsonSchema(schema, schema.definitions);
}

export function makePortSchemaMap(schema) {
  let res = {};
  res['serial'] = getSerialPortSchema(schema);
  res['tcp'] = getTcpPortSchema(schema);
  res['modbus tcp'] = getModbusTcpPortSchema(schema);
  return res;
}

export function getPortData(data: PortConfig) {
  let res = cloneDeep(data);
  delete res.devices;
  return res;
}

export function getTopics(portTabs: PortTab[], deviceTypesStore: DeviceTypesStore) {
  let topics = new Set<string>();
  portTabs.forEach((portTab) => {
    portTab.children.forEach((deviceTab) => {
      topics.add(
        (deviceTab.editedData.id as string) ||
        deviceTypesStore.getDefaultId(deviceTab.deviceType, deviceTab.slaveId),
      );
    });
  });
  return topics;
}

export function getDeviceTypeFromConfig(deviceConfig) {
  if (deviceConfig?.device_type) {
    return deviceConfig.device_type;
  }
  return 'protocol:' + (deviceConfig?.protocol || 'modbus');
}
