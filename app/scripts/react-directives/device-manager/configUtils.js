import firmwareIsNewer from '../../utils/fwUtils';
import { getDefaultObject } from './jsonSchemaUtils';

/**
 * Find device type name
 *
 * @typedef {object} Device_Template
 * @property {string} type type name
 * @property {object} schema JSON-schema of the type
 *
 * @param {string} deviceSignature
 * @param {string} fw
 * @param {Object.<string, object>} deviceTypeSchemas device type name to JSON-schema map
 * @returns {Device_Template|undefined}
 */
function findDeviceTemplate(deviceSignature, fw, deviceTypeSchemas) {
  let lastFwVersion = undefined;
  let deviceType = undefined;
  Object.entries(deviceTypeSchemas).forEach(([typeName, schema]) => {
    schema?.hw?.forEach(hw => {
      if (
        hw.signature == deviceSignature &&
        firmwareIsNewer(hw.fw, fw) &&
        firmwareIsNewer(lastFwVersion, hw.fw)
      ) {
        lastFwVersion = hw.fw;
        deviceType = { type: typeName, schema: schema };
      }
    });
  });
  return deviceType;
}

/**
 * Add scanned devices to wb-mqtt-serial config
 *
 * @typedef {object} Scanned_Device_Config
 * @property {number} slave_id
 * @property {number} baud_rate
 * @property {string} parity
 * @property {number} data_bits
 * @property {number} stop_bits
 *
 * @typedef {object} Scanned_Device
 * @property {string} title
 * @property {string} device_signature
 * @property {string} port
 * @property {Scanned_Device_Config} cfg
 * @property {string} fw
 *
 * @typedef {object} Add_Result
 * @property {Scanned_Device[]} unknown unknown devices
 * @property {Scanned_Device[]} misconfigured misconfigured devices
 * @property {added} added true if something is added to config
 *
 * @param {object} config wb-mqtt-serial config
 * @param {Scanned_Device[]} devices scanned devices
 * @param {Object.<string, object>} deviceTypeSchemas device type to JSON-schema map
 * @returns {Add_Result}
 */
export function addToConfig(config, devices, deviceTypeSchemas) {
  let res = { unknown: [], misconfigured: [], added: false };
  devices.forEach(device => {
    const template = findDeviceTemplate(device.device_signature, device.fw, deviceTypeSchemas);
    if (!template) {
      res.unknown.push(device);
      return;
    }
    let port = config.ports.find(p => p.path == device.port);
    if (!port) {
      return;
    }
    port.devices ??= [];
    if (
      !port.devices.find(d => d.slave_id == device.cfg.slave_id && d.device_type == template.type)
    ) {
      let deviceConfig = getDefaultObject(template.schema);
      deviceConfig.slave_id = String(device.cfg.slave_id);
      port.devices.push(deviceConfig);
      res.added = true;
      if (
        device.cfg.baud_rate != port.baud_rate ||
        device.cfg.data_bits != port.data_bits ||
        device.cfg.parity != port.parity ||
        device.cfg.stop_bits != port.stop_bits
      ) {
        res.misconfigured.push(device);
      }
    }
  });
  return res;
}
