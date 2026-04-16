import type { Register } from './types';

export class RegSpace {
  public addrs: Set<number> = new Set();
  #addrSalt = 7;
  #reservedUnitIds = [0, 1, 2, 247, 248, 249, 250, 251, 252, 253, 254, 255];

  append(register: Register, assign: boolean) {
    const size = this.#getRegisterSize(register);
    if (!assign) {
      for (let i = 0; i < size; ++i) {
        this.addrs.add((register.address + i) | (register.unitId << 16));
      }
      return;
    }

    let addrHash = this.#stringToHash(register.topic) & 0xffffff;
    while (
      this.addrs.has(addrHash) ||
      addrHash >> 16 !== (addrHash + size - 1) >> 16 ||
      this.#reservedUnitIds.includes(addrHash >> 16)
    ) {
      addrHash = (addrHash + this.#addrSalt) & 0xffffff;
    }

    for (let i = 0; i < size; ++i) {
      this.addrs.add(addrHash + i);
    }

    register.address = addrHash & 0xffff;
    register.unitId = addrHash >> 16;
  }

  #stringToHash(string: string) {
    let hash = 0;
    if (!string.length) {
      return hash;
    }
    for (let i = 0; i < string.length; i++) {
      hash = (hash << 5) - hash + string.charCodeAt(i);
      hash = hash & hash;
    }
    return hash;
  }

  #getRegisterSize(register: Register) {
    if (!register?.format || register.size <= 0) {
      console.log(register);
      return 1;
    }
    if (register.format === 'varchar') {
      return register.size;
    }
    return Math.floor(register.size / 2);
  }
}
