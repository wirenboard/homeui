import { getIntAddress } from '@/stores/device-manager';
import { type DeviceTypesStore } from '@/stores/device-manager';
import { type ConfiguredDevice } from './types';

/**
 * Generates a list of configured devices based on the given portTabChildren and deviceTypesStore.
 *
 * @param {Array} portTabChildren - The array of port tab children.
 * @param {Object} deviceTypesStore - The device types store object.
 */
function makeConfiguredDevicesList(portTabChildren, deviceTypesStore: DeviceTypesStore): ConfiguredDevice[] {
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

export class ConfiguredDevices {
  configuredDevices = [];

  constructor(portTabs, deviceTypesStore) {
    this.configuredDevices = getConfiguredModbusDevices(portTabs, deviceTypesStore);
  }

  /**
   * @description Device addresses grouped by port path
   */
  getUsedAddresses(): Map<string, Set<number>> {
    const getAddressesSet = (devices) => {
      return devices.reduce((addressAcc, d) => {
        const addrNumber = getIntAddress(d.address);
        return Number.isNaN(addrNumber) ? addressAcc : addressAcc.add(addrNumber);
      }, new Set());
    };

    return Object.entries(this.configuredDevices).reduce(
      (acc, [path, port]) => acc.set(path, getAddressesSet(port.devices)),
      new Map(),
    );
  }
}
