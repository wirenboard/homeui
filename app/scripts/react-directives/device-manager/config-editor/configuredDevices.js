'use strict';

import { getIntAddress } from '../common/modbusAddressesSet';

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
    if (portTab.portType == 'serial') {
      acc[portTab.editedData.path] = {
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

function getConfiguredDeviceByAddress(configuredDevices, scannedDevice) {
  if (!configuredDevices.hasOwnProperty(scannedDevice.port.path)) {
    return [];
  }
  const port = configuredDevices[scannedDevice.port.path];
  return port.devices.filter(
    d =>
      d.address == scannedDevice.cfg.slave_id &&
      scannedDevice.cfg.baud_rate == port.config.baudRate &&
      scannedDevice.cfg.parity == port.config.parity &&
      scannedDevice.cfg.stop_bits == port.config.stopBits
  );
}

class ConfiguredDevices {
  configuredDevices;
  uuidFoundByScan;

  constructor(portTabs, deviceTypesStore) {
    this.configuredDevices = getConfiguredModbusDevices(portTabs, deviceTypesStore);
    this.foundDevices = [];
    this.uuidFoundByScan = [];
  }

  findMatch(scannedDevice) {
    const configuredDevicesWithSameAddress = getConfiguredDeviceByAddress(
      this.configuredDevices,
      scannedDevice
    );

    if (configuredDevicesWithSameAddress.some(d => isCompletelySameDevice(scannedDevice, d))) {
      return true;
    }

    // Config has devices without SN. They are configured but never polled, maybe found device is one of them
    const maybeSameDevices = configuredDevicesWithSameAddress.filter(d =>
      isPotentiallySameDevice(scannedDevice, d)
    );

    if (this.uuidFoundByScan.includes(scannedDevice.uuid)) {
      return true;
    }
    const maybeSameDevice = maybeSameDevices.find(d => !this.foundDevices.includes(d));
    if (maybeSameDevice) {
      this.foundDevices.push(maybeSameDevice);
      this.uuidFoundByScan.push(scannedDevice.uuid);
      return true;
    }

    return false;
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
