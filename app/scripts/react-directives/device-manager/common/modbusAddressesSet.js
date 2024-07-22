'use strict';

class ModbusAddressSet {
  /**
   * @constructor
   * @param {Map<string, Set<number>>} usedAddresses - Devices addresses grouped by port path
   */
  constructor(usedAddresses) {
    this.usedAddresses = usedAddresses;
    this.freeAddresses = new Map();
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
