import { getIntAddress } from '@/stores/device-manager/utils';

export class ModbusAddressSet {
  public usedAddresses: Map<string, Set<number>>;
  public freeAddresses: Map<string, number>;

  constructor(usedAddresses: Map<string, Set<number>>) {
    this.usedAddresses = usedAddresses;
    this.freeAddresses = new Map();
  }

  tryToAddUsedAddress(portPath: string, address: number): boolean {
    const addr = getIntAddress(address);
    let usedAddresses = this.usedAddresses.get(portPath);
    if (usedAddresses === undefined) {
      usedAddresses = new Set();
      this.usedAddresses.set(portPath, usedAddresses);
    }
    if (usedAddresses.has(addr)) {
      return false;
    }
    usedAddresses.add(addr);
    return true;
  }

  fixAddress(portPath: string, address: number) {
    const addr = getIntAddress(address);
    let usedAddresses = this.usedAddresses.get(portPath);
    if (usedAddresses === undefined) {
      usedAddresses = new Set();
      this.usedAddresses.set(portPath, usedAddresses);
    }

    if (!usedAddresses.has(addr)) {
      usedAddresses.add(addr);
      return addr;
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
