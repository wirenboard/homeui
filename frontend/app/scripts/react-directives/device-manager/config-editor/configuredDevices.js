'use strict';

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
    if (portTab.portType == 'serial' || portTab.portType == 'tcp') {
      acc[portTab.path] = {
        type: portTab.portType,
        config: portTab.baseConfig,
        devices: makeConfiguredDevicesList(portTab.children, deviceTypesStore),
      };
    }
    return acc;
  }, {});
}

function isCompletelySameDevice(scannedDevice, configuredDevice) {
  return (
    configuredDevice.address == scannedDevice.cfg.slave_id &&
    configuredDevice.signatures.includes(scannedDevice.device_signature) &&
    configuredDevice.sn == scannedDevice.sn
  );
}

function isPotentiallySameDevice(scannedDevice, configuredDevice) {
  return (
    configuredDevice.address == scannedDevice.cfg.slave_id &&
    configuredDevice.signatures.includes(scannedDevice.device_signature) &&
    !configuredDevice.sn
  );
}

function hasSameSerialConfig(port, scannedDevice) {
  // WB devices can operate regardless to stop bits setting, so compare baud rate, parity and data bits
  return (
    port.config?.baudRate == scannedDevice.cfg.baud_rate &&
    port.config?.parity == scannedDevice.cfg.parity &&
    port.config?.dataBits == scannedDevice.cfg.data_bits
  );
}

function getConfiguredDevicesByAddress(configuredDevices, scannedDevice) {
  if (!configuredDevices.hasOwnProperty(scannedDevice.port.path)) {
    return [];
  }
  const port = configuredDevices[scannedDevice.port.path];
  return port.devices.filter(
    d =>
      d.address == scannedDevice.cfg.slave_id &&
      (port.type !== 'serial' || hasSameSerialConfig(port, scannedDevice))
  );
}

class ConfiguredDevices {
  configuredDevices = [];

  /**
   * Key is the UUID of the scanned device
   *
   * @type {Object.<string, ConfiguredDevice>}
   */
  foundDevices = {};

  constructor(portTabs, deviceTypesStore) {
    this.configuredDevices = getConfiguredModbusDevices(portTabs, deviceTypesStore);
  }

  /**
   * Finds a match for a scanned device in the configured devices.
   *
   * @param {Object} scannedDevice - The scanned device to find a match for.
   * @returns {ConfiguredDevice|null} - The matched configured device, or null if no match is found.
   */
  findMatch(scannedDevice) {
    let configuredDevice = this.foundDevices?.[scannedDevice.uuid];
    if (configuredDevice) {
      return configuredDevice;
    }

    const configuredDevicesWithSameAddress = getConfiguredDevicesByAddress(
      this.configuredDevices,
      scannedDevice
    );

    configuredDevice = configuredDevicesWithSameAddress.find(d =>
      isCompletelySameDevice(scannedDevice, d)
    );
    if (configuredDevice) {
      this.foundDevices[scannedDevice.uuid] = configuredDevice;
      return configuredDevice;
    }

    // Config has devices without SN. They are configured but never polled, maybe found device is one of them
    const maybeSameDevices = configuredDevicesWithSameAddress.filter(d =>
      isPotentiallySameDevice(scannedDevice, d)
    );

    const foundDevicesList = Object.values(this.foundDevices);
    const maybeSameDevice = maybeSameDevices.find(d => !foundDevicesList.includes(d));
    if (maybeSameDevice) {
      this.foundDevices[scannedDevice.uuid] = maybeSameDevice;
      return maybeSameDevice;
    }

    return null;
  }

  /**
   * @returns {Map<string, Set<number>>} - Device addresses grouped by port path
   */
  getUsedAddresses() {
    const getAddressesSet = devices => {
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
