import { getIntAddress } from '../common/modbusAddressesSet';

/**
 * @typedef {Object} ConfiguredDevice
 * @property {number} address - The address of the device.
 * @property {string} sn - The serial number of the device.
 * @property {string} deviceType - The type of the device.
 * @property {Array} signatures - The signatures of the device.
 */

/**
 * Generates a list of configured devices based on the given portTabChildren and deviceTypesStore.
 *
 * @param {Array} portTabChildren - The array of port tab children.
 * @param {Object} deviceTypesStore - The device types store object.
 * @returns {Array.<ConfiguredDevice>} - The list of configured devices.
 */
function makeConfiguredDevicesList(portTabChildren, deviceTypesStore) {
  return portTabChildren.reduce((acc, deviceTab) => {
    const deviceType = deviceTab.editedData.device_type;
    if (deviceTypesStore.isModbusDevice(deviceType)) {
      acc.push({
        address: deviceTab.slaveId,
        sn: deviceTab.editedData.sn,
        deviceType: deviceType,
        signatures: deviceTypesStore.getDeviceSignatures(deviceType),
      });
    }
    return acc;
  }, []);
}

function getConfiguredModbusDevices(portTabs, deviceTypesStore) {
  return portTabs.reduce((acc, portTab) => {
    acc[portTab.path] = {
      type: portTab.portType,
      config: portTab.baseConfig,
      devices: makeConfiguredDevicesList(portTab.children, deviceTypesStore),
    };
    return acc;
  }, {});
}

class ConfiguredDevices {
  configuredDevices = [];

  constructor(portTabs, deviceTypesStore) {
    this.configuredDevices = getConfiguredModbusDevices(portTabs, deviceTypesStore);
  }

  /**
   * @returns {Map<string, Set<number>>} - Device addresses grouped by port path
   */
  getUsedAddresses() {
    const getAddressesSet = (devices) => {
      return devices.reduce((addressAcc, d) => {
        const addrNumber = getIntAddress(d.address);
        return Number.isNaN(addrNumber) ? addressAcc : addressAcc.add(addrNumber);
      }, new Set());
    };

    return Object.entries(this.configuredDevices).reduce(
      (acc, [path, port]) => acc.set(path, getAddressesSet(port.devices)),
      new Map()
    );
  }
}

export default ConfiguredDevices;
