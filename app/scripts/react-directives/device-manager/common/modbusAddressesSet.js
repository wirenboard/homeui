'use strict';

class ModbusAddressSet {
  /**
   * @typedef {Object} ConfiguredDevice
   * @property {number} address
   *
   * @constructor
   * @param {Object.<string, ConfiguredDevice>} configuredDevices - Configured devices grouped by port path
   */
  constructor(configuredDevices) {
    this.usedAddresses = new Map();
    this.freeAddresses = new Map();
    Object.entries(configuredDevices).forEach(([path, devices]) => {
      this.usedAddresses.set(
        path,
        devices.reduce((acc, device) => {
          acc.add(Number.isInteger(device.address) ? device.address : parseInt(device.address));
          return acc;
        }, new Set())
      );
    });
  }

  tryToAddUsedAddress(portPath, address) {
    if (!Number.isInteger(address)) {
      address = parseInt(address);
    }
    let usedAddresses = this.usedAddresses.get(portPath);
    if (usedAddresses === undefined) {
      usedAddresses = new Set();
      this.usedAddresses.set(portPath, usedAddresses);
    }
    if (usedAddresses.has(address)) {
      return false;
    }
    usedAddresses.add(address);
    return true;
  }

  fixAddress(portPath, address) {
    if (!Number.isInteger(address)) {
      address = parseInt(address);
    }
    let usedAddresses = this.usedAddresses.get(portPath);
    if (usedAddresses === undefined) {
      usedAddresses = new Set();
      this.usedAddresses.set(portPath, usedAddresses);
    }

    if (!usedAddresses.has(address)) {
      usedAddresses.add(address);
      return address;
    }

    let freeAddress = this.freeAddresses.get(portPath);
    if (freeAddress === undefined) {
      freeAddress = 1;
    }

    while (freeAddress < 255 && usedAddresses.has(freeAddress)) {
      ++freeAddress;
    }
    this.freeAddresses.set(portPath, freeAddress + 1);
    usedAddresses.add(freeAddress);
    return freeAddress;
  }
}

export default ModbusAddressSet;
