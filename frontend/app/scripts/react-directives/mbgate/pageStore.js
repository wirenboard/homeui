'use strict';

import AccessLevelStore from '../components/access-level/accessLevelStore';
import PageWrapperStore from '../components/page-wrapper/pageWrapperStore';
import { makeObservable, computed, observable, action } from 'mobx';
import SelectControlsModalState from './selectControlsModalState';
import i18n from '../../i18n/react/config';
import { makeParameterStoreFromJsonSchema } from '../forms/jsonSchemaForms';

const ADDR_SALT = 7079;
const RESERVED_UNIT_IDS = [0, 1, 2, 247, 248, 249, 250, 251, 252, 253, 254, 255];

function stringToHash(string) {
  let hash = 0;
  if (string.length == 0) {
    return hash;
  }
  for (let i = 0; i < string.length; i++) {
    hash = (hash << 5) - hash + string.charCodeAt(i);
    hash = hash & hash;
  }
  return hash;
}

function getRegisterSize(register) {
  if (!register?.format || register.size <= 0) {
    return 1;
  }
  if (register.format === 'varchar') {
    return register.size;
  }
  return Math.floor(register.size / 2);
}

class RegSpace {
  constructor() {
    this.addrs = new Set();
  }

  async append(register, assign) {
    const size = getRegisterSize(register);
    if (!assign) {
      for (let i = 0; i < size; ++i) {
        this.addrs.add((register.address + i) | (register.unitId << 16));
      }
      return;
    }

    let addrHash = stringToHash(register.topic) & 0xffffff;
    while (
      this.addrs.has(addrHash) ||
      addrHash >> 16 != (addrHash + size - 1) >> 16 ||
      RESERVED_UNIT_IDS.includes(addrHash >> 16)
    ) {
      addrHash = (addrHash + ADDR_SALT) & 0xffffff;
    }

    for (let i = 0; i < size; ++i) {
      this.addrs.add(addrHash + i);
    }

    register.address = addrHash & 0xffff;
    register.unitId = addrHash >> 16;
  }
}

function makeSingleBitRegisterBinding(topic) {
  return { topic: topic, enabled: true, unitId: 1, address: 1 };
}

function makeWordRegisterBinding(topic, format) {
  return {
    topic: topic,
    enabled: true,
    unitId: 1,
    address: 1,
    format: format,
    size: format == 'varchar' ? 1 : 2,
    max: 0,
    scale: 1,
    byteswap: false,
    wordswap: false,
  };
}

function mergeRegs(registers, newRegs, type) {
  if (!newRegs[type].length) {
    return;
  }
  let regSpace = new RegSpace();
  registers[type].forEach(reg => regSpace.append(reg, false));
  newRegs[type].forEach(reg => regSpace.append(reg, true));
  registers[type] = registers[type].concat(newRegs[type]);
}

class MbGateStore {
  constructor(rolesFactory, deviceData, saveFn) {
    this.pageWrapperStore = new PageWrapperStore();
    this.accessLevelStore = new AccessLevelStore(rolesFactory);
    this.accessLevelStore.setRole(rolesFactory.ROLE_THREE);
    this.saveFn = saveFn;
    this.selectControlsModalState = new SelectControlsModalState(deviceData);
    this.paramsStore = {};
    this.deviceData = deviceData;

    makeObservable(this, {
      isDirty: computed,
      allowSave: computed,
      paramsStore: observable.ref,
      setSchemaAndData: action,
    });
  }

  setSchemaAndData(schema, data) {
    this.paramsStore = makeParameterStoreFromJsonSchema(schema, i18n.language);
    this.paramsStore?.setValue(data);
    let keepalive = this.paramsStore.params?.['mqtt']?.params?.['keepalive'];
    keepalive.setStrict(false);
    keepalive.setDefaultText('60');
    this.paramsStore.submit();
    this.pageWrapperStore.setLoading(false);
  }

  async save() {
    this.pageWrapperStore.setLoading(true);
    try {
      await this.saveFn(this.paramsStore.value);
      this.pageWrapperStore.clearError();
      this.paramsStore.submit();
    } catch (e) {
      this.pageWrapperStore.setError(e.message);
    }
    this.pageWrapperStore.setLoading(false);
  }

  async addControls() {
    let registers = this.paramsStore.value['registers'];
    const configuredControls = Object.values(registers).flatMap(registerTypeArray =>
      registerTypeArray.map(register => register['topic'])
    );
    if (!(await this.selectControlsModalState.show(configuredControls))) {
      return;
    }

    const selectedControls = this.selectControlsModalState.selectedControls;
    if (selectedControls.length === 0) {
      return;
    }
    const coilTypes = ['switch', 'alarm', 'pushbutton'];
    let newRegs = {
      coils: [],
      discretes: [],
      holdings: [],
      inputs: [],
    };

    selectedControls.forEach(control => {
      const cell = this.deviceData.cell(control);
      if (cell && cell.isComplete()) {
        if (coilTypes.includes(cell.type)) {
          const arrayType = cell.readOnly ? 'discretes' : 'coils';
          newRegs[arrayType].push(makeSingleBitRegisterBinding(control));
        } else {
          const arrayType = cell.readOnly ? 'inputs' : 'holdings';
          if (cell.type === 'text') {
            newRegs[arrayType].push(makeWordRegisterBinding(control, 'varchar'));
          } else {
            newRegs[arrayType].push(makeWordRegisterBinding(control, 'signed'));
          }
        }
      }
    });

    mergeRegs(registers, newRegs, 'coils');
    mergeRegs(registers, newRegs, 'discretes');
    mergeRegs(registers, newRegs, 'holdings');
    mergeRegs(registers, newRegs, 'inputs');

    this.paramsStore.params['registers'].setValue(registers);
  }

  get isDirty() {
    return this.paramsStore.isDirty;
  }

  get allowSave() {
    return this.isDirty && !this.pageWrapperStore.loading && !this.paramsStore.hasErrors;
  }
}

export default MbGateStore;
