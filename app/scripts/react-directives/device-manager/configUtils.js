import { getDefaultObject } from './jsonSchemaUtils';

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
 * @param {object} deviceTypesStore
 * @returns {Add_Result}
 */
export async function addToConfig(config, devices, deviceTypesStore) {
  let res = { unknown: [], misconfigured: [], added: false };
  await Promise.all(
    devices.map(async device => {
      const deviceType = deviceTypesStore.findDeviceType(device.device_signature, device.fw);
      if (!deviceType) {
        res.unknown.push(device);
        return;
      }
      let port = config?.ports?.find(p => p.path == device.port);
      if (!port) {
        return;
      }
      port.devices ??= [];
      if (
        !port.devices.find(d => d.slave_id == device.cfg.slave_id && d.device_type == deviceType)
      ) {
        let deviceConfig = getDefaultObject(await deviceTypesStore.getSchema(deviceType));
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
    })
  );
  return res;
}
